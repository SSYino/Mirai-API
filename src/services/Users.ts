import Environment from '../providers/Environment';
import GoogleAPI from "../providers/GoogleAPI";
import Prisma from "../providers/Prisma";

import { ServiceError, DatabaseError } from "../exception/Errors"

import Validator from "validator";
import Sessions from './Sessions';
import Logger from '../libs/Logger';
import HTTP_STATUS from '../libs/HTTPStatus';

class Users {

    constructor() {

    }

    public static generateAuthenticateURL() {

        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: GoogleAPI.scopes,
        });

        return authUrl;

    }

    public static async createUser(id: string, email: string, given_name: string, family_name: string, picture_url: string) {

        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let doesExist = await Users.exists(id);

        if (doesExist)
            throw new ServiceError(HTTP_STATUS.CONFLICT, 'Google ID already exists');

        const studentIdRegex = /^\d+/
        const userDataRegex = /^(\d+)\.(\d+)\s/
        const match1 = email.match(studentIdRegex)
        const match2 = given_name.match(userDataRegex)

        let student_id
        let grade_level: string | undefined
        let grade_room: string | undefined
        let student_class_number

        if (match1) student_id = match1[0]
        if (match2) {
            const [_, grade, studentNumber] = match2
            grade_level = grade.substring(0, 1)
            grade_room = grade.substring(1)
            student_class_number = parseInt(studentNumber)
        }

        const isStudent = Boolean(student_id)
        const result = await Prisma.client.users.create({
            data: {
                id: id,
                given_name: given_name,
                family_name: family_name,
                email: email,
                grade_level,
                grade_room,
                student_class_number,
                student_id,
                picture_url: picture_url,
                isStudent,
                isTeacher: !isStudent
            },
        });

        // Create the four default chat rooms (if they don't already exist)
        const defaultChatRooms = ["main", "students", "teachers", "class"];
        const ChatRoomNames: any = {
            main: "Main Chat",
            students: "Students",
            teachers: "Teachers",
            class: "Class Chat"
        }

        const defaultChatRoomsMembers = await Prisma.client.chatRooms.findMany({
            where: {
                OR: defaultChatRooms.map(roomId => ({ id: roomId }))
            },
            select: {
                id: true,
                members: true,
                Users: true
            }
        })

        let roomsInDB: string[] = [];
        let roomsNotInDB: string[] = [];
        let roomsUserNotIn: string[] = [];

        defaultChatRoomsMembers.forEach(room => {
            if (((room.id === "class") && isStudent && grade_level && grade_room) || ((room.id === "students") && isStudent) || (room.id === "teachers" && !isStudent) || (room.id === "main")) {
                const userData = room.Users.find(user => user.id === id);
                if (!userData) {
                    roomsUserNotIn.push(room.id)
                }
            }

            roomsInDB.push(room.id)
        })

        defaultChatRooms.forEach(roomId => {
            if (!roomsInDB.includes(roomId)) roomsNotInDB.push(roomId)
        })

        roomsNotInDB.forEach(async roomId => await Prisma.client.chatRooms.create({
            data: {
                id: roomId,
                name: ChatRoomNames[roomId],
                isDM: false,
                isGroup: true,
                isMadeByTeacher: false,
                members: (((roomId === "teachers") && isStudent) || (["students", "class"].includes(roomId) && !isStudent) || ((roomId === "class") && (!grade_level || !grade_room))) ? [] : [{
                    name: `${given_name} ${family_name}`,
                    userId: id
                }],
                Users: { connect: { id } }
            }
        }))

        roomsUserNotIn.forEach(async roomId => {
            const roomData = defaultChatRoomsMembers.find(room => room.id === roomId);
            if (!roomData) return;
            const oldMembers = roomData.members
            const oldUsers = roomData.Users
            const userData = {
                name: `${given_name} ${family_name}`,
                userId: id
            };
            
            const prismaData = {
                members: oldMembers ? [...JSON.parse(JSON.stringify(oldMembers)), userData] : [userData],
                Users: { connect: [...oldUsers.map(user => ({ id: user.id })), { id }] }
            }

            await Prisma.client.chatRooms.update({
                where: {
                    id: roomId,
                },
                data: prismaData
            })
        })

        if (result == null)
            throw new DatabaseError("User creation failed, result is null");

        return true;
    }

    public static async authenticate(code: string) {
        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        let token, profile;

        try {
            token = await oAuth2Client.getToken(code);
        } catch (err: any) {
            if (err?.response?.data?.error === "invalid_grant")
                throw new ServiceError(HTTP_STATUS.UNAUTHORIZED, "Invalid Google OAuth2 grant");
            else
                throw err;
        }

        await oAuth2Client.setCredentials(token.tokens);

        const oauth2 = GoogleAPI.google.oauth2({
            auth: oAuth2Client,
            version: 'v2'
        });

        profile = await oauth2.userinfo.get();

        let doesExist = await Users.exists(profile.data.id);
        let gmail = await GoogleAPI.google.gmail('v1').users.getProfile({
            userId: profile.data.id,
            auth: oAuth2Client,
        });


        if (!doesExist) {
            await Users.createUser(profile.data.id, gmail.data.emailAddress, profile.data.given_name, profile.data.family_name, profile.data.picture);
        } else {
            const user = await this.getUser(profile.data.id);

            // This should not be possible at all
            if (user.id !== profile.data.id) {
                throw new ServiceError(HTTP_STATUS.FORBIDDEN, 'Your GoogleID has been changed! Please contact the developer');
            }

            const studentIdRegex = /^\d+/
            const userDataRegex = /^(\d+)\.(\d+)\s/
            const match1 = gmail.data.emailAddress.match(studentIdRegex)
            const match2 = profile.data.given_name.match(userDataRegex)

            let student_id = null
            let grade_level = null
            let grade_room = null
            let student_class_number = null

            if (match1) student_id = match1[0]
            if (match2) {
                const [_, grade, studentNumber] = match2
                grade_level = grade.substring(0, 1)
                grade_room = grade.substring(1)
                student_class_number = parseInt(studentNumber)
            }
            const isStudent = Boolean(student_id)

            if (
                user.given_name !== profile.data.given_name ||
                user.family_name !== profile.data.family_name ||
                user.email !== gmail.data.emailAddress ||
                user.picture_url !== profile.data.picture ||
                user.grade_level !== grade_level ||
                user.grade_room !== grade_room ||
                user.student_class_number !== student_class_number ||
                user.student_id !== student_id) {

                const result = await Prisma.client.users.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        given_name: profile.data.given_name,
                        family_name: profile.data.family_name,
                        email: gmail.data.emailAddress,
                        grade_level,
                        grade_room,
                        student_class_number,
                        student_id,
                        picture_url: profile.data.picture,
                        isStudent,
                        isTeacher: !isStudent
                    }
                });

                if (result == null)
                    throw new DatabaseError("User update failed, result is null");

            }

        }

        if (await this.isSuspended(profile.data.id)) {
            throw new ServiceError(HTTP_STATUS.FORBIDDEN, 'Your account is currently suspended');
        }

        const issuedToken = await Sessions.issueToken(profile.data.id, token.tokens.access_token, token.tokens.refresh_token, token.tokens.expiry_date);
        const user = await this.getUser(profile.data.id);

        return {
            token: issuedToken,
            profile: {
                family_name: profile.data.family_name,
                given_name: profile.data.given_name,
                id: profile.data.id,
                locale: profile.data.locale,
                name: profile.data.name,
                picture: profile.data.picture,
                emailAddress: gmail.data.emailAddress
            },
            isAdmin: user.isAdmin,
            isDeveloper: user.isDeveloper,
            isTeacher: user.isTeacher,
            isStudent: user.isStudent,
            isSuspended: user.isSuspended
        }
    }

    public static async getUser(id: string) {
        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });

        if (result == null)
            throw new ServiceError(HTTP_STATUS.NOT_FOUND, 'User does not exist');

        return result;
    }

    public static async getAllUser({ search, page, perPage, role, status }: any) {

        let options = {
        };

        if (page && perPage) {
            if (perPage != -1) {
                (options as any).skip = (parseInt(page) - 1) * parseInt(perPage);
                (options as any).take = parseInt(perPage);
            }
        }

        if (role) {
            let merge;

            if (role === "admin")
                merge = { isAdmin: true };
            else if (role === "student")
                merge = { isStudent: true };
            else if (role === "teacher")
                merge = { isTeacher: true };
            else if (role === "developer")
                merge = { isDeveloper: true };

            if (merge)
                (options as any).where = { ...(options as any).where, ...merge };
        }

        if (search) {
            const merge = {
                OR: [
                    {
                        id: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        given_name: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        family_name: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        email: {
                            contains: search,
                            mode: 'insensitive'
                        }
                    },
                ]
            };
            (options as any).where = { ...(options as any).where, ...merge };
        }

        if (status) {
            let merge;

            if (status === "active")
                merge = { isSuspended: false };
            else if (status === "suspended")
                merge = { isSuspended: true };

            if (merge)
                (options as any).where = { ...(options as any).where, ...merge };
        }

        const result = await Prisma.client.users.findMany(options);
        return result;

    }

    public static async exists(id: string) {

        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });

        if (result == null)
            return false;

        return true;

    }

    public static isGoogleIdValid(id: string) {
        if (!Validator.isNumeric(id))
            return false;

        return true;
    }

    public static async isAdmin(id: string) {

        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let user = await this.getUser(id);

        return user.isAdmin;
    }

    public static async isDeveloper(id: string) {

        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let user = await this.getUser(id);

        return user.isDeveloper;
    }

    public static async isSuspended(id: string) {

        if (!this.isGoogleIdValid(id))
            throw new ServiceError(HTTP_STATUS.BAD_REQUEST, 'Invalid GoogleID');

        let user = await this.getUser(id);

        return user.isSuspended;
    }

}

export default Users;

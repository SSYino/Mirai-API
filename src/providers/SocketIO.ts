import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

import Logger from "../libs/Logger";
import Environment from "./Environment";

import ExpressException from '../exception/ExpressException';

import RateLimit from '../middlewares/RateLimit';

import Routes from './Routes';
import Express from './Express';
import { Server, Socket } from 'socket.io';
import Sessions from '../services/Sessions';
import Users from '../services/Users';

declare module 'socket.io' {
    interface Socket {
        userId: string
    }
}

class SocketIO {

    public io: any;

    constructor() {
        this.io = null;
    }

    public init(): void {
        this.io = new Server(Express.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.use(async (socket: Socket, next: any) => {

            const token: string = socket.handshake.auth.token;
            const clientInfo: any = socket.handshake.auth.clientInfo;

            // if (!clientInfo)
            //     return next(new Error("No client info provided"));

            // if (!clientInfo.revision || !clientInfo.revision_short)
            //     return next(new Error("No client revision provided"));

            if (!token)
                return next(new Error("No token provided"));

            // Do your auth token here
            if (!await (Sessions.validateToken(token)))
                return next(new Error("Invalid id or token"));

            // Assign user id to socket
            socket.userId = await Sessions.getTokenOwner(token);

            return next();
        })

        const everyone = this.io.of("/")
        const student = this.io.of("/student")
        const teacher = this.io.of("/teacher")

        everyone.on("connection", async (socket: Socket) => {
            const user = await Users.getUser(socket.userId)
            Logger.log("debug", `User ${user.given_name} ${user.family_name} connected with socketId "${socket.id}"`)
            // socket.send("You connected")

            // Check if user is a student or a teacher and join rooms accordingly
            if (!user.isStudent && user.isTeacher) {
                // Is not a student
                Logger.log("debug", "Is not a student")
                socket.join(["/", "teachers"])
                socket.emit("new-room", { user, rooms: ["teachers"] })

                // TODO : Make chat room logic for teachers
            } else if (user.isStudent && !user.isTeacher) {
                // Is a student
                const { grade_level, grade_room } = user
                if (!(grade_level && grade_room)) {
                    console.log("User does not have grade_level and/or grade_room")

                    socket.join(["/", "students"])
                    socket.emit("new-room", { user, rooms: ["students"] })
                }
                else {
                    const socketRoom = grade_level + "/" + grade_room
                    socket.join(["/", "students", socketRoom])
                    socket.emit("new-room", { user, rooms: ["students", socketRoom] })

                    console.log("socket is in namespace", socket.nsp.name)
                }
            } else console.log("Unknown if user is a teacher or student")

            socket.on("message", (data) => {
                Logger.log("debug", `${user.given_name} ${user.family_name} said "${data.msg}" ${data.room ? `in room ${data.room}` : "in main room"}`)

                if (data.room) {
                    if (!socket.rooms.has(data.room)) socket.emit("new-room", { user, rooms: [data.room] })

                    const isDM = /^DM@.+;.+$/.test(data.room)
                    everyone.in(data.room).emit("message", { msg: data.msg, user, socketId: socket.id, room: data.room, isDM }) // Remove room prop later
                }
                else {
                    everyone.in("/").emit("message", { msg: data.msg, user, room: "/" }) // Remove room prop later
                }
            })

            socket.on("getUserData", () => socket.emit("userData", { user }))
            socket.on("createDM", (data) => {
                const { receiver } = data
                const dmRoomName = `DM@${socket.userId};${receiver.userId}`

                everyone.in([socket.id, receiver.socketId]).socketsJoin(dmRoomName)
                socket.emit("new-room", { user, rooms: [dmRoomName] })
            })

            socket.on("disconnect", () => {
                Logger.log("debug", `User ${user.given_name} ${user.family_name} DISCONNECTED with socketId "${socket.id}"`)
            })
        })

        // TODO : Finish student namespace
        student.on("connection", (socket: Socket) => {
            console.log("socket in namespace", socket.nsp.name)
            Logger.log("debug", "A student connected")
        })

        // TODO : Finish teacher namespace
        teacher.on("connection", (socket: Socket) => {
            Logger.log("debug", "A teacher connected")
        })

        Logger.log("info", "Socket server started")
    }

    public end(): void {
        this.io.close()
    }
}

export default new SocketIO();

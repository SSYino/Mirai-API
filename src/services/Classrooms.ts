import Environment from "../providers/Environment";
import GoogleAPI from "../providers/GoogleAPI";
import PrismaProvider from "../providers/Prisma";

import Validator from "validator";
import Sessions from "./Sessions";
import Logger from "../libs/Logger";

import { Prisma } from '@prisma/client';
import Users from "./Users";
import { google } from "googleapis";
class Classrooms {
    constructor() { }

    public static async getClasses(token: string, status: string, cached: boolean) {

        let sessions = await Sessions.getGoogleToken(token);

        const fetchUncached = async () => {
            const credentials = GoogleAPI.getConfig();

            const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
                credentials.web.client_id,
                credentials.web.client_secret,
                credentials.web.redirect_uris[0]
            );

            await oAuth2Client.setCredentials({
                access_token: sessions.access_token,
                refresh_token: sessions.refresh_token,
            });

            const classroom = GoogleAPI.google.classroom({
                version: "v1",
                auth: oAuth2Client,
            });

            const res = await classroom.courses.list({
                courseStates: status,
            });

            const courses = res.data.courses;

            await PrismaProvider.client.classes.createMany({
                data: courses,
                skipDuplicates: true
            });

            (async () => {
                let all_id = [];
                for (let c of courses) {
                    await PrismaProvider.client.classes.update({
                        where: { id: c.id },
                        data: c
                    });
                    all_id.push(c.id);
                }

                await PrismaProvider.client.users.update({
                    where: {
                        id: sessions.owner
                    },
                    data: {
                        classes: (all_id as Prisma.JsonArray)
                    }
                });
            })();
            return courses;
        }

        if (!cached) {
            return await fetchUncached();
        }
        else {
            let user = await Users.getUser(sessions.owner);

            if ((user.classes as string[]) == null)
                return await fetchUncached();

            let courses = await PrismaProvider.client.classes.findMany({
                where: {
                    id: {
                        in: (user.classes as string[])
                    }
                }
            });

            let sorted: any = [];
            for (const id of (user.classes as string[])) {

                const result = courses.filter(obj => {
                    return obj.id === id
                });

                if (result[0])
                    sorted.push(result[0]);
            }

            return sorted;
        }


    }

    public static async getAssignments(token: string, status: string, cached: boolean) {

        let sessions = await Sessions.getGoogleToken(token);
        let sessionOwner = await Sessions.getTokenOwner(token);

        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id,
            credentials.web.client_secret,
            credentials.web.redirect_uris[0]
        );

        await oAuth2Client.setCredentials({
            access_token: sessions.access_token,
            refresh_token: sessions.refresh_token,
        });

        const fetchCached = async () => {

        }

        const fetchUncached = async () => {

            const classroom = GoogleAPI.google.classroom({
                version: "v1",
                auth: oAuth2Client,
            });

            const classes = await this.getClasses(token, "ACTIVE", true);

            let data: any = [];
            let requests = [];

            for (let _class of classes) {
                requests.push(new Promise(async (resolve, reject) => {
                    try {
                        const courses_assigments = await classroom.courses.courseWork.list({
                            //fields: 'courseWork(id,title)',
                            courseId: _class.id,
                        });

                        if (!courses_assigments.data.courseWork)
                            return resolve(undefined);

                        let idToData: any = {};
                        for (let courses of courses_assigments.data.courseWork) {
                            idToData[courses.id] = {
                                title: courses.title
                            };
                        }

                        const res = await classroom.courses.courseWork.studentSubmissions.list({
                            fields: 'studentSubmissions(courseId,courseWorkId,id,creationTime,updateTime,state,alternateLink,courseWorkType)',
                            courseId: _class.id,
                            courseWorkId: '-',
                            userId: 'me',
                            //states: ['NEW', 'CREATED']
                            //courseWorkStates: status
                        });

                        if (res.data.studentSubmissions) {
                            for (let cw of res.data.studentSubmissions) {
                                cw.title = idToData[cw.courseWorkId].title;
                                data.push(cw);
                            }
                        }
                        //data[_class.id] = res.data.courseWork;

                        return resolve(res.data.studentSubmissions);
                    } catch (err) {
                        return reject(err);
                    }
                }));
            }

            await Promise.all(requests)
            let sorted = data.sort((a: any, b: any) => (a.courseWorkId > b.courseWorkId) ? 1 : ((b.courseWorkId > a.courseWorkId) ? -1 : 0));

            let db_data = [];

            for (let db_e of sorted) {
                db_data.push({
                    id: db_e.id,
                    courseId: db_e.courseId,
                    courseWorkId: db_e.courseWorkId,
                    creationTime: db_e.creationTime,
                    updateTime: db_e.updateTime,
                    state: db_e.state,
                    alternateLink: db_e.alternateLink,
                    courseWorkType: db_e.courseWorkType,
                    title: db_e.title
                });
            }

            await PrismaProvider.client.assignments.createMany({
                data: db_data,
                skipDuplicates: true
            });

            (async () => {
                let all_id = [];
                for (let c of db_data) {
                    await PrismaProvider.client.assignments.update({
                        where: { id: c.id },
                        data: c
                    });
                    all_id.push(c.id);
                }

                await PrismaProvider.client.users.update({
                    where: {
                        id: sessions.owner
                    },
                    data: {
                        assignments: (all_id as Prisma.JsonArray)
                    }
                });

            })();

            return sorted;

        }

        if (!cached) {
            try {
                let data = await fetchUncached();
                return data;
            } catch (err: any) {
                if (err.message === "Invalid Credentials") {
                    let renew = await Sessions.refreshAccessToken(sessionOwner, sessions.access_token, sessions.refresh_token);
                    await oAuth2Client.setCredentials({
                        access_token: renew.access_token,
                        refresh_token: renew.refresh_token,
                    });
                    return await fetchUncached();
                }
                else
                    throw err;
            }
        }
        else {
            let user = await Users.getUser(sessions.owner);

            if ((user.assignments as string[]) == null)
                return await fetchUncached();

            let assignments = await PrismaProvider.client.assignments.findMany({
                where: {
                    id: {
                        in: (user.assignments as string[])
                    }
                }
            });

            /*let sorted: any = [];
            for(const id of (user.assignments as string[])) {

                const result = courses.filter(obj => {
                    return obj.id === id
                });
                  
                if(result[0])
                    sorted.push(result[0]);
            }*/

            let sorted = assignments.sort((a: any, b: any) => (a.courseWorkId > b.courseWorkId) ? 1 : ((b.courseWorkId > a.courseWorkId) ? -1 : 0));

            return sorted;
        }

    }

    public static async getCalendar(token: string, cached: boolean) {
        let sessions = await Sessions.getGoogleToken(token);
        const user = await Users.getUser(sessions.owner);
        const MILLISECONDS_IN_A_MONTH = 2_628_288_000;
        const unixTimestampLastMonth = new Date().getTime() - MILLISECONDS_IN_A_MONTH;

        const fetchUncached = async () => {
            const credentials = GoogleAPI.getConfig();

            const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
                credentials.web.client_id,
                credentials.web.client_secret,
                credentials.web.redirect_uris[0]
            );

            await oAuth2Client.setCredentials({
                access_token: sessions.access_token,
                refresh_token: sessions.refresh_token,
            });

            // const calendar = GoogleAPI.google.calendar("v3")
            const calendar = google.calendar("v3");
            console.log(new Date(unixTimestampLastMonth).toISOString());

            // const res = await calendar.calendarList.list({
            //    // maxResults: <num>, // default: 100
            //     showHidden: true,
            //     auth: oAuth2Client
            // })
            const res = await calendar.events.list({
                calendarId: "primary",
                orderBy: "updated",
                maxResults: 2500,
                timeMin: new Date(unixTimestampLastMonth).toISOString(), // 1 month prior to request time
                // showDeleted: true,
                auth: oAuth2Client
            })

            const resData = res.data;

            // if (!resData.items) throw "resData.items is undefined"

            // if (!resData.items.every(item => Object.values(item).every(val => val !== undefined || val !== null)))
            //     throw "resData.items has items with id properties as undefined or null"
            // if (!resData.items.every(item => {
            //     console.log(item)
            //     typeof item.id === "undefined" || item.id === null
            // })) {
            //     throw "resData.items has items with id properties as undefined or null"
            // }

            // const testArr = []
            // for (const item of resData.items) {
            //     if (!item.id) {
            //         continue
            //     }
            //     else testArr.push(item)
            // }

            // const calendarsData = testArr.map(item => {
            //     return {
            //         id: item.id!,
            //         kind: item.kind,
            //         etag: item.etag,
            //         summary: item.summary,
            //         description: item.description,
            //         timeZone: item.timeZone,
            //         colorId: item.colorId,
            //         backgroundColor: item.backgroundColor,
            //         foregroundColor: item.foregroundColor,
            //         selected: item.selected,
            //         deleted: item.deleted,
            //         accessRole: item.accessRole,
            //         hidden: item.hidden,
            //         primary: item.primary,
            //         allowedConferenceSolutionTypes: item.conferenceProperties?.allowedConferenceSolutionTypes,
            //         defaultReminders: item.defaultReminders as string[],
            //         userId: user.id
            //     }
            // })

            // await PrismaProvider.client.calendar.upsert({
            //     where: { userId: user.id },
            //     create: {
            //         owner: {
            //             connect: { id: user.id }
            //         },
            //         nextPageToken: resData.nextPageToken,
            //         CalendarData: {
            //             createMany: {
            //                 skipDuplicates: true,
            //                 data: calendarsData
            //             }
            //         },
            //         items: calendarsData
            //     },
            //     update: {
            //         nextPageToken: resData.nextPageToken,
            //         CalendarData: {
            //             createMany: {
            //                 skipDuplicates: true,
            //                 data: calendarsData
            //             }
            //         },
            //         items: calendarsData
            //     }
            //     // data: {
            //     //     calendarId: calendarData.id,
            //     //     owner: {
            //     //         connect: { id: user.id }
            //     //     },
            //     //     title: calendarData.summary,
            //     //     description: calendarData.description,
            //     //     location: calendarData.location,
            //     //     foregroundColor: calendarData.foregroundColor,
            //     //     backgroundColor: calendarData.backgroundColor,
            //     //     deleted: calendarData.deleted,
            //     //     hidden: calendarData.hidden,
            //     //     primary: calendarData.primary,
            //     //     selected: calendarData.selected,
            //     //     timeZone: calendarData.timeZone
            //     // }
            // });

            // TODO | finish the code below

            // (async () => {
            //     let all_id = [];
            //     for (let c of courses) {
            //         await PrismaProvider.client.classes.update({
            //             where: { id: c.id },
            //             data: c
            //         });
            //         all_id.push(c.id);
            //     }

            //     await PrismaProvider.client.users.update({
            //         where: {
            //             id: sessions.owner
            //         },
            //         data: {
            //             classes: (all_id as Prisma.JsonArray)
            //         }
            //     });
            // })();
            return resData;
        }

        if (!cached) {
            return await fetchUncached();
        }
        else {
            let user = await Users.getUser(sessions.owner);

            if ((user.classes as string[]) == null)
                return await fetchUncached();

            let courses = await PrismaProvider.client.classes.findMany({
                where: {
                    id: {
                        in: (user.classes as string[])
                    }
                }
            });

            let sorted: any = [];
            for (const id of (user.classes as string[])) {

                const result = courses.filter(obj => {
                    return obj.id === id
                });

                if (result[0])
                    sorted.push(result[0]);
            }

            return sorted;
        }
    }
}

export default Classrooms;
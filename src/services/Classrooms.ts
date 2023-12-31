import Environment from "../providers/Environment";
import GoogleAPI from "../providers/GoogleAPI";
import PrismaProvider from "../providers/Prisma";

import Validator from "validator";
import Sessions from "./Sessions";
import Logger from "../libs/Logger";

import { Prisma } from '@prisma/client';
import Users from "./Users";
import { google } from "googleapis";
import moment from "moment";

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

            const isLate = (courseWork: any): boolean | null => {
                if (!courseWork.dueDate || !courseWork.dueTime)
                    return null
                
                const { year, month, day } = courseWork.dueDate
                const { hours, minutes } = courseWork.dueTime

                const timeNow = moment()
                const dueTime = moment(`${year}-${month}-${day} ${hours}:${minutes ?? "00"}`)

                if (!dueTime.isValid())
                    console.log("not valid time", dueTime, {
                        year, month, day, hours, minutes
                    })

                return timeNow.isAfter(dueTime)
            }

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
                                title: courses.title,
                                description: courses.description,
                                late: isLate(courses)
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
                                cw.late = idToData[cw.courseWorkId].late;
                                cw.description = idToData[cw.courseWorkId].description;
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
            let sorted = data.sort((a: any, b: any) => moment(a.updateTime).isAfter(moment(b.updateTime)) ? -1 : 1);

            let db_data = [];

            for (let db_e of sorted) {
                db_data.push({
                    id: db_e.id,
                    courseId: db_e.courseId,
                    courseWorkId: db_e.courseWorkId,
                    creationTime: db_e.creationTime,
                    updateTime: db_e.updateTime,
                    state: db_e.state,
                    late: db_e.late,
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

    public static async getCalendar(token: string, cached: boolean, range: number = 1) {
        let sessions = await Sessions.getGoogleToken(token);
        const user = await Users.getUser(sessions.owner);

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

            const calendar = GoogleAPI.google.calendar("v3")

            const res = await calendar.events.list({
                calendarId: "primary",
                orderBy: "startTime",
                maxResults: 2500,
                showDeleted: false,
                singleEvents: true,
                timeMin: moment().subtract(range, "month").startOf("month").toISOString(), // <range> months prior to request time
                timeMax: moment().add(range, "month").endOf("month").toISOString(), // <range> months after request time
                auth: oAuth2Client
            })

            const resData = res.data;
            if (!resData.items) return "events list undefined";

            // Asynchronously update the database
            (async () => {
                const primaryCalendarData = (await calendar.calendarList.get({
                    calendarId: "primary",
                    auth: oAuth2Client
                })).data

                const primaryEventsData = [];
                if (!resData.items) return;
                for (const events of resData.items) {
                    if (!events.id) continue;
                    primaryEventsData.push({
                        eventId: events.id,
                        data: JSON.parse(JSON.stringify(events))
                    })
                }

                await PrismaProvider.client.calendar.upsert({
                    where: {
                        id_userId: {
                            id: "primary",
                            userId: user.id
                        }
                    },
                    create: {
                        id: "primary",
                        owner: {
                            connect: { id: user.id }
                        },
                        Events: {
                            createMany: {
                                data: primaryEventsData,
                                skipDuplicates: true
                            }
                        },
                        data: JSON.parse(JSON.stringify(primaryCalendarData))
                    },
                    update: {
                        Events: {
                            createMany: {
                                data: primaryEventsData,
                                skipDuplicates: true
                            }
                        },
                        data: JSON.parse(JSON.stringify(primaryCalendarData))
                    }
                });
            })();

            return resData.items.reverse();
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

    public static async getMeetings(token: string, today: boolean = false, cached: boolean) {

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

            // TODO: Use user timestamp instead
            const calendar = google.calendar("v3");
            let meetingsData;

            if (today) {
                const partialCalendarEvents = await calendar.events.list({
                    calendarId: "primary",
                    orderBy: "startTime",
                    singleEvents: true,
                    fields: "items(summary,creator,organizer,hangoutLink,start,end)",
                    timeMin: moment().subtract(1, "day").toISOString(),
                    timeMax: moment().add(1, "day").toISOString(),
                    auth: oAuth2Client
                })

                if (!partialCalendarEvents.data.items) throw "data.items undefined";

                const calendarEventsToday = partialCalendarEvents.data.items.filter(event => moment().isSame(event.start?.dateTime, "day"))

                meetingsData = {
                    today: {
                        total: calendarEventsToday?.length,
                        items: calendarEventsToday
                    }
                }
            }
            else {
                const meetings = new Map();

                const allEvents = await calendar.events.list({
                    calendarId: "primary",
                    maxResults: 2500,
                    orderBy: "updated",
                    fields: "items(status,summary,creator,organizer,hangoutLink,start,end)",
                    timeMin: moment().subtract(3, "month").startOf("month").toISOString(),
                    timeMax: moment().add(3, "month").endOf("month").toISOString(),
                    auth: oAuth2Client
                })

                if (!allEvents.data.items) throw "data.items undefined";

                for (const event of allEvents.data.items) {
                    if (event.status === "cancelled" || !event.hangoutLink) continue;

                    delete event.status;
                    meetings.set(event.summary, {
                        ...event
                    })
                }

                meetingsData = {
                    all: {
                        total: meetings.size,
                        items: Array.from(meetings.values())
                    }
                }
            }

            // Asycnhronously update the database
            // (async () => {

            // })();

            return meetingsData
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
            // let user = await Users.getUser(sessions.owner);

            // if ((user.assignments as string[]) == null)
            //     return await fetchUncached();

            // let assignments = await PrismaProvider.client.assignments.findMany({
            //     where: {
            //         id: {
            //             in: (user.assignments as string[])
            //         }
            //     }
            // });

            /*let sorted: any = [];
            for(const id of (user.assignments as string[])) {
    
                const result = courses.filter(obj => {
                    return obj.id === id
                });
                  
                if(result[0])
                    sorted.push(result[0]);
            }*/

            // let sorted = assignments.sort((a: any, b: any) => (a.courseWorkId > b.courseWorkId) ? 1 : ((b.courseWorkId > a.courseWorkId) ? -1 : 0));

            // return sorted;
        }
    }
}

export default Classrooms;
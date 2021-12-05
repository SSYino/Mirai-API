import Environment from "../providers/Environment";
import GoogleAPI from "../providers/GoogleAPI";
import PrismaProvider from "../providers/Prisma";

import Validator from "validator";
import Sessions from "./Sessions";
import Logger from "../libs/Logger";

import { Prisma } from '@prisma/client';
import Users from "./Users";

class Classrooms {
    constructor() {}

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
                for(let c of courses) {
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

        if(cached) {
            return await fetchUncached();
        }
        else {
            let user = await Users.getUser(sessions.owner);

            if((user.classes as string[]) == null)
                return await fetchUncached();

            let courses = await PrismaProvider.client.classes.findMany({
                where: {
                    id: {
                        in: (user.classes as string[])
                    }
                }
            });

            let sorted: any = [];
            for(const id of (user.classes as string[])) {

                const result = courses.filter(obj => {
                    return obj.id === id
                });
                  
                if(result[0])
                    sorted.push(result[0]);
            }

            return sorted;
        }
        
        
    }

    public static async getAssignments(token: string, status: string, cached: boolean){

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

            const classes = await this.getClasses(token, "ACTIVE", true);

            let data: any = [];
            let requests = [];
            for(let _class of classes) {
                requests.push(new Promise (async (resolve, reject) => {
                    try {
                        const courses_assigments = await classroom.courses.courseWork.list({
                            fields: 'courseWork(id,title)',
                            courseId: _class.id,
                        });

                        if(!courses_assigments.data.courseWork)
                            return resolve(courses_assigments.data.courseWork);

                        let idToData: any = {};
                        for(let courses of courses_assigments.data.courseWork) {
                            idToData[courses.id] = {
                                title: courses.title
                            };
                        }

                        const res = await classroom.courses.courseWork.studentSubmissions.list({
                            fields: 'studentSubmissions(courseId,courseWorkId,id,creationTime,updateTime,state,alternateLink,courseWorkType)',
                            courseId: _class.id,
                            courseWorkId: '-',
                            userId: 'me',
                            states: ['NEW', 'CREATED']
                            //courseWorkStates: status
                        });
                        if(res.data.studentSubmissions) {
                            for(let cw of res.data.studentSubmissions) {
                                cw.title = idToData[cw.courseWorkId].title;
                                data.push(cw);
                            }
                        }
                            //data[_class.id] = res.data.courseWork;
                        
                            return resolve(res.data.studentSubmissions);
                    } catch(err) {
                        return reject(err);
                    }
                }));
            }

            await Promise.all(requests)

            return data;
          
        }

        return await fetchUncached();
        
        
    }

}

export default Classrooms;
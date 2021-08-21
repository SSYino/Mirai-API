import Environment from "../providers/Environment";
import GoogleAPI from "../providers/GoogleAPI";
import Prisma from "../providers/Prisma";

import Validator from "validator";
import Sessions from "./Sessions";
import Logger from "../libs/Logger";

class Classrooms {
  constructor() {}

  public static async getAllClasses(token: string, status: string) {
    let sessions = await Sessions.getGoogleToken(token);
    if (!sessions.success)
      return {
        success: false,
        error: sessions.error,
      };

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

    return {
      success: true,
      courses: courses,
    };
  }

  public static async getCourseWork(token: string, status: string) {
    let sessions = await Sessions.getGoogleToken(token);
    if (!sessions.success)
      return {
        success: false,
        error: sessions.error,
      };

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

    let allRequest = [];

    let allCW = {};

    for (let i = 0; i < courses.length; i++) {
      const pPromise = new Promise(async (resolve, reject) => {
        try {
          let cw = await classroom.courses.courseWork.list({
            courseId: courses[i].id,
          });

          if (typeof cw.data.courseWork !== "undefined") {
            let temp = {
              [courses[i].id]: cw.data.courseWork,
            };
            Object.assign(allCW, temp);
            resolve(temp);
          } else {
            resolve(undefined);
          }
        } catch (err) {
          reject(err);
        }
      });

      allRequest.push(pPromise);
    }

    const finalResult = await Promise.all(allRequest);

    return {
      success: true,
      courses: allCW,
    };
  }
}

export default Classrooms;

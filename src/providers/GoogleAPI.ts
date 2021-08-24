import { google } from 'googleapis';

import Logger from "../libs/Logger";
import Environment from "./Environment";

import ExpressException from '../exception/ExpressException';

class GoogleAPI {

    public scopes: any = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/classroom.courses',
        'https://www.googleapis.com/auth/classroom.coursework.me',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly'

    ];

    public google: any;

    constructor () {
        this.google = google;
    }

    public init(): void {

    }

    public getConfig(): any {
        return JSON.parse(JSON.stringify(Environment.get().GOOGLEAPI));        
    }


}

export default new GoogleAPI();

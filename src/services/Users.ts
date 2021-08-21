

import Environment from '../providers/Environment';
import GoogleAPI from "../providers/GoogleAPI";
import Prisma from "../providers/Prisma";

import Validator from "validator";
import Sessions from './Sessions';
import Logger from '../libs/Logger';

const WHITELIST = [

];

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

    public static async createUser(id: string, given_name: string, family_name: string, picture_url: string) {

        if(!this.isGoogleIdValid(id).result)
            return {
                success: false,
                error: this.isGoogleIdValid(id).error
            }

        let doesExist = await Users.exists(id);

        if(typeof doesExist.error !== "undefined")
            return {
                success: false,
                error: doesExist.error
            }
    
        if (doesExist.result)
            return {
                success: false,
                error: "Google ID already exists"
            }

        const result = await Prisma.client.users.create({
            data: {
                id: id,
                given_name: given_name,
                family_name: family_name,
                picture_url: picture_url,
            },
        });

        if (result == null)
            throw new Error("User creation failed, result is null");

        return {
            success: true
        };
    }

    public static async authenticate(code: string) {
        const credentials = GoogleAPI.getConfig();

        const oAuth2Client = new GoogleAPI.google.auth.OAuth2(
            credentials.web.client_id, credentials.web.client_secret, credentials.web.redirect_uris[0]);

        let profile;

        try {

            let token = await oAuth2Client.getToken(code);
            await oAuth2Client.setCredentials(token.tokens);
        
            const oauth2 = GoogleAPI.google.oauth2({
                auth: oAuth2Client,
                version: 'v2'
            });

            profile = await oauth2.userinfo.get();

            if(!this.isWhitelisted(profile.data.id)) {
                return {
                    success: false,
                    error: "You're not whitelisted. If you wish to access the application, please contact the developer and give them your user id: " + profile.data.id
                }
            }

            let doesExist = await Users.exists(profile.data.id);

            if(typeof doesExist.error !== "undefined")
                return {
                    success: false,
                    error: doesExist.error
                }
    
            if (!doesExist.result) {
                let result = await Users.createUser(profile.data.id, profile.data.given_name, profile.data.family_name, profile.data.picture);
                
                if(!result.success)
                    throw result.error;
            }

            let issueToken = await Sessions.issueToken(profile.data.id, token.tokens.access_token, token.tokens.refresh_token, token.tokens.expiry_date);
            
            if(!issueToken.success)
                return {
                    success: false,
                    error: issueToken.error
                }

            return {
                success: true,
                token: issueToken.token
            }
          
            /*profile = await GoogleAPI.google.people('v1').people.get({
                resourceName: 'people/me',
                personFields: 'emailAddresses,names',
                auth: oAuth2Client,
            });*/


        } catch(err: any) {

            if(err || !err.message) {
                
                Logger.log('warn', 'Unable to authenticate');
                Logger.log('warn', err);

                return({
                    success: false,
                    error: "Unable to authenticate"
                });
            }
            else if(err.message.includes("invalid_grant")) {
                
                return({
                    success: false,
                    error: "Invalid login details, please try again"
                });
            }
            else {
                
                Logger.log('warn', 'Unable to authenticate');
                Logger.log('warn', err);

                return({
                    success: false,
                    error: "Unable to authenticate"
                });
            }

        }

    }

    public static async getUser(id: string) {


        if(!this.isGoogleIdValid(id).result)
            return {
                success: false,
                error: this.isGoogleIdValid(id).error
            }
            
        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });

        if (result == null)
            return {
                success: false,
                error: "User does not exist"
            };

        return {
            success: true,
            data: result
        };

    }

    public static async getAllUser() {

        const result = await Prisma.client.users.findMany();

        if (result == null)
            return {
                success: false,
                error: "No users exist"
            };

        return {
            success: true,
            data: result
        };

    }

    public static async exists(id: string) {

        if(!this.isGoogleIdValid(id).result)
            return {
                result: false,
                error: this.isGoogleIdValid(id).error
            }

        const result = await Prisma.client.users.findUnique({
            where: {
                id: id
            },
        });
    
        if (result == null)
            return {
                result: false
            };
        
        return {
            result: true
        };

    }

    public static isGoogleIdValid(id: string) {

        if (!Validator.isNumeric(id))
            return {
                result: false,
                error: "Invalid Google ID"
            };

        return {
            result: true
        };

    }

    public static isWhitelisted(id: string) {
        return true;
        //return WHITELIST.includes(id)
    }

    public static async isAdmin(id: string) {

        if (!Validator.isNumeric(id))
            return {
                result: false,
                error: "Invalid Google ID"
            };

        let user = await this.getUser(id);
        if(!user.success) {
            return {
                result: false,
                error: user.error
            };
        }
        
        else {
            return {
                result: user.data?.isAdmin
            };
        }
    }
    
}

export default Users;

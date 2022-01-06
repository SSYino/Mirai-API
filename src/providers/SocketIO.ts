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

            // console.log(socket.handshake)
            // console.log(socket.userId)
            return next();
        })

        const student = this.io.of("/student")
        const teacher = this.io.of("/teacher")

        student.on("connection", async (socket: Socket) => {
            const user = await Users.getUser(socket.userId)
            console.log(`User ${user.given_name} ${user.family_name} connected with socketId "${socket.id}"`)
            // socket.send("You connected")
            socket.on("message", (data) => {
                console.log(`${socket.id} said ${data.msg}`)
                this.io.emit("message", { msg: data.msg, user })
            })

            socket.on("disconnect", () => {
                console.log(`User ${socket.id} disconnected`)
            })
        })

        // TODO : Finish teacher namespace
        teacher.on("connection", (socket: Socket) => {
            console.log("A teacher connected")
        })

        Logger.log("info", "Socket server started")
    }

    public end(): void {
        this.io.close()
    }
}

export default new SocketIO();

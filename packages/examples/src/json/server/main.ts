/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { Socket } from 'net';
import express from 'express';
import { IWebSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import { createConnection } from 'vscode-languageserver/lib/node/main.js';
import { getLocalDirectory } from '../../utils/fs-utils.js';
import { JsonServer } from './json-server.js';

/**
 * start the language server inside the current process
 */
const launchLanguageServer = (socket: IWebSocket): JsonServer => {
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);
    const connection = createConnection(reader, writer);
    const server = new JsonServer(connection);
    server.start();
    return server;
};

export const runJsonServer = () => {
    process.on('uncaughtException', function(err: any) {
        console.error('Uncaught Exception: ', err.toString());
        if (err.stack) {
            console.error(err.stack);
        }
    });

    // create the express application
    const app = express();
    // server the static content, i.e. index.html
    const dir = getLocalDirectory(import.meta.url);
    app.use(express.static(dir));
    // start the server
    const server = app.listen(3000);
    // create the web socket
    const wss = new WebSocketServer({
        noServer: true,
        perMessageDeflate: false
    });
    server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
        const baseURL = `http://${request.headers.host}/`;
        const pathname = request.url ? new URL(request.url, baseURL).pathname : undefined;
        if (pathname === '/sampleServer') {
            wss.handleUpgrade(request, socket, head, webSocket => {
                const socket: IWebSocket = {
                    send: content => webSocket.send(content, error => {
                        if (error) {
                            throw error;
                        }
                    }),
                    onMessage: cb => webSocket.on('message', (data) => {
                        console.log(data.toString());
                        cb(data);
                    }),
                    onError: cb => webSocket.on('error', cb),
                    onClose: cb => webSocket.on('close', cb),
                    dispose: () => webSocket.close()
                };
                // launch the server when the web socket is opened
                if (webSocket.readyState === webSocket.OPEN) {
                    launchLanguageServer(socket);
                } else {
                    webSocket.on('open', () => launchLanguageServer(socket));
                }
            });
        }
    });
};

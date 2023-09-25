/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as monaco from 'monaco-editor';
import * as vscode from 'vscode';
import 'vscode/default-extensions/theme-defaults';
import 'vscode/default-extensions/python';
import { updateUserConfiguration } from 'vscode/service-override/configuration';
import { LogLevel } from 'vscode/services';
import { createConfiguredEditor, createModelReference } from 'vscode/monaco';
import { ExtensionHostKind, registerExtension } from 'vscode/extensions';
import { initServices, MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction, MessageTransports } from 'vscode-languageclient';
import { WebSocketMessageReader, WebSocketMessageWriter, toSocket } from 'vscode-ws-jsonrpc';
import { RegisteredFileSystemProvider, registerFileSystemOverlay, RegisteredMemoryFile } from 'vscode/service-override/files';

import { buildWorkerDefinition } from 'monaco-editor-workers';
buildWorkerDefinition('../../../node_modules/monaco-editor-workers/dist/workers/', new URL('', window.location.href).href, false);

const languageId = 'python';
let languageclient: MonacoLanguageClient;

const createLanguageClient = (transports: MessageTransports) => {
    return new MonacoLanguageClient({
        name: 'ts client',
        clientOptions: {
            documentSelector: [languageId],
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart })
            }
        },
        connectionProvider: {
            get: () => {
                return Promise.resolve(transports);
            }
        }
    });
};

const createWebSocket = (url:string) => {
    const webSocket = new WebSocket(url);
    webSocket.onopen = async () => {
        const socket = toSocket(webSocket);
        const reader = new WebSocketMessageReader(socket);
        const writer = new WebSocketMessageWriter(socket);
        languageclient = createLanguageClient({ reader, writer });
        await languageclient.start();
        reader.onClose(() => languageclient.stop());
    };
    return webSocket;
};

export const startTSClient = async () => {
    await initServices({
        enableModelService: true,
        enableThemeService: true,
        enableTextmateService: true,
        configureConfigurationService: {
            defaultWorkspaceUri: '/'
        },
        enableLanguagesService: true,
        enableKeybindingsService: true,
        debugLogging: true,
        logLevel: LogLevel.Debug
    });

    const extension = {
        name: 'typescript-client',
        publisher: 'monaco-languageclient-project',
        version: '1.0.0',
        engines: {
            vscode: '^1.78.0'
        },
        contributes: {
            languages: [{
                id: 'typescript',
                aliases: ['TypeScript', 'ts'],
                extensions: ['.ts', '.tsx']
            }]
        }
    };

    registerExtension(extension, ExtensionHostKind.LocalProcess);

    updateUserConfiguration(`{
        "editor.fontSize": 14,
        "workbench.colorTheme": "Default Dark Modern"
    }`);

    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    fileSystemProvider.registerFile(new RegisteredMemoryFile(vscode.Uri.file('/test.ts'), 'console.log("test");'));
    registerFileSystemOverlay(1, fileSystemProvider);

    createWebSocket('ws://localhost:30000');

    const modelRef = await createModelReference(monaco.Uri.file('/test.ts'));
    modelRef.object.setLanguageId(languageId);

    createConfiguredEditor(document.getElementById('container')!, {
        model: modelRef.object.textEditorModel,
        automaticLayout: true
    });
};

/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { resolve } from 'path';
import { runPythonServer } from './main.js';
import { getLocalDirectory } from '../../utils/fs-utils.js';

const baseDir = resolve(getLocalDirectory(import.meta.url));
// const relativeDir = '../../../../../node_modules/pyright/dist/pyright-langserver.js';
const relativeDir = '../../../../../node_modules/typescript-language-server/lib/cli.mjs';
runPythonServer(baseDir, relativeDir);

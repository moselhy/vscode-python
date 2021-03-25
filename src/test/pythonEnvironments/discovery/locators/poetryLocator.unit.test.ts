// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import * as sinon from 'sinon';
import { Uri } from 'vscode';
import {
    PythonEnvInfo,
    PythonEnvKind,
    PythonEnvSource,
    PythonReleaseLevel,
    PythonVersion,
    UNKNOWN_PYTHON_VERSION,
} from '../../../../client/pythonEnvironments/base/info';
import * as externalDependencies from '../../../../client/pythonEnvironments/common/externalDependencies';
import * as platformUtils from '../../../../client/common/utils/platform';
import { getEnvs } from '../../../../client/pythonEnvironments/base/locatorUtils';
import { PoetryLocator } from '../../../../client/pythonEnvironments/discovery/locators/services/poetryLocator';
import { TEST_LAYOUT_ROOT } from '../../common/commonTestConstants';
import { assertEnvsEqual } from './envTestUtils';
import { ExecutionResult, ShellOptions } from '../../../../client/common/process/types';

suite('Poetry locator', () => {
    let shellExecute: sinon.SinonStub;
    let getPythonSetting: sinon.SinonStub;
    const testPoetryDir = path.join(TEST_LAYOUT_ROOT, 'poetry');

    function createExpectedEnvInfo(
        interpreterPath: string,
        kind: PythonEnvKind,
        version: PythonVersion = UNKNOWN_PYTHON_VERSION,
        name = '',
        location = path.join(testPoetryDir, name),
        searchLocation: Uri | undefined = undefined,
    ): PythonEnvInfo {
        return {
            name,
            location,
            kind,
            executable: {
                filename: interpreterPath,
                sysPrefix: '',
                ctime: -1,
                mtime: -1,
            },
            display: undefined,
            version,
            arch: platformUtils.Architecture.Unknown,
            distro: { org: '' },
            searchLocation,
            source: [PythonEnvSource.Other],
        };
    }

    setup(() => {
        shellExecute = sinon.stub(externalDependencies, 'shellExecute');
        getPythonSetting = sinon.stub(externalDependencies, 'getPythonSetting');
        getPythonSetting.returns('poetry');
    });

    teardown(() => sinon.restore());

    test('iterEnvs(): Windows', async function () {
        if (platformUtils.getOSType() !== platformUtils.OSType.Windows) {
            this.skip();
        }
        const project1 = path.join(testPoetryDir, 'project1');
        // Arrange
        shellExecute.callsFake((command: string, options: ShellOptions) => {
            // eslint-disable-next-line default-case
            if (command === 'poetry --version') {
                return Promise.resolve<ExecutionResult<string>>({ stdout: '' });
            }
            if (command === 'poetry env info -p') {
                if (options.cwd && externalDependencies.arePathsSame(options.cwd, project1)) {
                    return Promise.resolve<ExecutionResult<string>>({
                        stdout: `${path.join(project1, '.venv')} \n`,
                    });
                }
            } else if (command === 'poetry env list --full-path') {
                if (options.cwd && externalDependencies.arePathsSame(options.cwd, project1)) {
                    return Promise.resolve<ExecutionResult<string>>({
                        stdout: `${path.join(testPoetryDir, 'poetry-tutorial-project-6hnqYwvD-py3.8')} \n
                        ${path.join(testPoetryDir, 'globalwinproject-9hvDnqYw-py3.11')}`,
                    });
                }
            }
            return Promise.reject(new Error('Command failed'));
        });

        // Act
        const locator = new PoetryLocator(project1);
        const iterator = locator.iterEnvs();
        const actualEnvs = (await getEnvs(iterator)).sort((a, b) =>
            a.executable.filename.localeCompare(b.executable.filename),
        );

        // Assert
        const expectedEnvs = [
            createExpectedEnvInfo(
                path.join(testPoetryDir, 'poetry-tutorial-project-6hnqYwvD-py3.8', 'Scripts', 'python.exe'),
                PythonEnvKind.Poetry,
                {
                    major: 3,
                    minor: 9,
                    micro: 0,
                    release: { level: PythonReleaseLevel.Alpha, serial: 1 },
                    sysVersion: undefined,
                },
                'poetry-tutorial-project-6hnqYwvD-py3.8',
            ),
            createExpectedEnvInfo(
                path.join(testPoetryDir, 'globalwinproject-9hvDnqYw-py3.11', 'Scripts', 'python.exe'),
                PythonEnvKind.Poetry,
                { major: 3, minor: 6, micro: 1 },
                'globalwinproject-9hvDnqYw-py3.11',
            ),
            createExpectedEnvInfo(
                path.join(project1, '.venv', 'Scripts', 'python.exe'),
                PythonEnvKind.Poetry,
                {
                    major: 3,
                    minor: 8,
                    micro: 2,
                    release: { level: PythonReleaseLevel.Final, serial: 0 },
                    sysVersion: undefined,
                },
                '.venv',
                path.join(project1, '.venv'),
                Uri.file(project1),
            ),
        ].sort((a, b) => a.executable.filename.localeCompare(b.executable.filename));
        assertEnvsEqual(actualEnvs, expectedEnvs);
    });

    test('iterEnvs(): non-Windows', async function () {
        if (platformUtils.getOSType() === platformUtils.OSType.Windows) {
            this.skip();
        }
        const project2 = path.join(testPoetryDir, 'project2');
        // Arrange
        shellExecute.callsFake((command: string, options: ShellOptions) => {
            // eslint-disable-next-line default-case
            if (command === 'poetry --version') {
                return Promise.resolve<ExecutionResult<string>>({ stdout: '' });
            }
            if (command === 'poetry env info -p') {
                if (options.cwd && externalDependencies.arePathsSame(options.cwd, project2)) {
                    return Promise.resolve<ExecutionResult<string>>({
                        stdout: `${path.join(project2, '.venv')} \n`,
                    });
                }
            } else if (command === 'poetry env list --full-path') {
                if (options.cwd && externalDependencies.arePathsSame(options.cwd, project2)) {
                    return Promise.resolve<ExecutionResult<string>>({
                        stdout: `${path.join(testPoetryDir, 'posix1project-9hvDnqYw-py3.4')} \n
                        ${path.join(testPoetryDir, 'posix2project-6hnqYwvD-py3.7')}`,
                    });
                }
            }
            return Promise.reject(new Error('Command failed'));
        });

        // Act
        const locator = new PoetryLocator(project2);
        const iterator = locator.iterEnvs();
        const actualEnvs = (await getEnvs(iterator)).sort((a, b) =>
            a.executable.filename.localeCompare(b.executable.filename),
        );

        // Assert
        const expectedEnvs = [
            createExpectedEnvInfo(
                path.join(testPoetryDir, 'posix1project-9hvDnqYw-py3.4', 'python'),
                PythonEnvKind.Poetry,
                undefined,
                'posix1project-9hvDnqYw-py3.4',
            ),
            createExpectedEnvInfo(
                path.join(testPoetryDir, 'posix2project-6hnqYwvD-py3.7', 'bin', 'python'),
                PythonEnvKind.Poetry,
                undefined,
                'posix2project-6hnqYwvD-py3.7',
            ),
            createExpectedEnvInfo(
                path.join(project2, '.venv', 'bin', 'python'),
                PythonEnvKind.Poetry,
                { major: 3, minor: 6, micro: 1 },
                '.venv',
                path.join(project2, '.venv'),
                Uri.file(project2),
            ),
        ].sort((a, b) => a.executable.filename.localeCompare(b.executable.filename));
        assertEnvsEqual(actualEnvs, expectedEnvs);
    });
});

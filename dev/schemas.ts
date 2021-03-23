// This script automatically generates API request validation schemas based on the default export type of any TS file under `pages/api` (given the file has no TS errors).
// This is awful. But that's okay because it's funny. Oh, and also useful.

import { createGenerator } from 'ts-json-schema-generator';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';

const run = (command: string) => new Promise(resolve => {
	const childProcess = exec(command);
	childProcess.stdout?.pipe(process.stdout);
	childProcess.stderr?.pipe(process.stderr);
	childProcess.once('exit', resolve);
});

const updated: Record<string, number> = {};

fs.watch('pages/api', { recursive: true }, async (evt, filename) => {
	const sourcePath = path.join('pages/api', filename);
	if (sourcePath.endsWith('.ts') && !sourcePath.endsWith('.validate.ts')) {
		const sourcePathWithoutExtension = sourcePath.slice(0, -3);
		const outputPath = `${sourcePathWithoutExtension}.validate.ts`;
		const outputExists = fs.existsSync(outputPath);
		if (fs.existsSync(sourcePath)) {
			if (!(sourcePath in updated) || Date.now() - updated[sourcePath] > 1000) {
				updated[sourcePath] = Date.now();
				const inputPath = path.join('dev', ['', ...filename.split(path.sep)].join('__'));
				if (!fs.existsSync(inputPath)) {
					await fs.createFile(inputPath);
				}
				await fs.writeFile(
					inputPath,
					`import type Handler from '${sourcePathWithoutExtension.split(path.sep).join('/')}';\n\nexport type Request = NonNullable<typeof Handler['Request']>;`
				);
				try {
					const schemaString = JSON.stringify(
						createGenerator({
							path: inputPath,
							tsconfig: 'tsconfig.json',
							additionalProperties: true
						}).createSchema('Request'),
						null,
						'\t'
					);
					if (!outputExists) {
						await fs.createFile(outputPath);
					}
					await fs.writeFile(
						outputPath,
						`import { createValidator } from 'modules/server/api';\n\nexport default createValidator(${schemaString});`
					);
					await run(`npx eslint --fix ${outputPath}`);
				} catch (error) {
					console.error(error);
				}
				if (!fs.existsSync(sourcePath)) {
					fs.unlink(outputPath);
				}
				if (fs.existsSync(inputPath)) {
					fs.unlink(inputPath);
				}
			}
		} else if (outputExists) {
			fs.unlink(outputPath);
		}
	}
});
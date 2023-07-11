import * as M from '../index.ts';
import { language } from './parser.ts';
import { mergeText } from './util.ts';
import * as P from './core.ts';

export type FullParserOpts = {
	fnNameList?: string[];
	emojiCodeList?: string[];
	nestLimit?: number;
};

export function fullParser(input: string, opts: FullParserOpts): M.MfmNode[] {
	const result = language.fullParser.handler(input, 0, {
		nestLimit: (opts.nestLimit != null) ? opts.nestLimit : 20,
		fnNameList: opts.fnNameList,
		emojiCodeList: opts.emojiCodeList,
		depth: 0,
		linkLabel: false,
		trace: false,
	}) as P.Success<any>;
	return mergeText(result.value);
}

export function simpleParser(input: string): M.MfmSimpleNode[] {
	const result = language.simpleParser.handler(input, 0, { }) as P.Success<any>;
	return mergeText(result.value);
}

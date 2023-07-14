import {parse,parseSimple,toString} from './mfm-js/index.ts';
const inputText =
    `<center>
Hello $[tada everynan! :tada:]
@ai
https://google.com/
</center>`;

// Generate a MFM tree from the full MFM text.
const mfmTree = parse(inputText);
console.log(mfmTree);
// Generate a MFM tree from the simple MFM text.
const simpleMfmTree = parseSimple('I like the hot soup :soup:');
console.log(simpleMfmTree);
// Reverse to a MFM text from the MFM tree.
const text = toString(mfmTree);
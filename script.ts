import * as mfm from 'https://github.com/misskey-dev/mfm.js/raw/develop/src/index'
const inputText = 
`<center>
Hello $[tada everynan! :tada:]
@ai
https://google.com/
</center>`;

// Generate a MFM tree from the full MFM text.
const mfmTree = mfm.parse(inputText);
 console.log(mfmTree);
// Generate a MFM tree from the simple MFM text.
const simpleMfmTree = mfm.parseSimple('I like the hot soup :soup:​');
 console.log(simpleMfmTree);
// Reverse to a MFM text from the MFM tree.
const text = mfm.toString(mfmTree);
import * as mfm from 'https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/index.js';
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/index.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/api.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/node.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/internal/parser.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/internal/util.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/internal/index.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@2022.7.21-dev.1/built/internal/core/index.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/index.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/api.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/node.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/internal/index.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/internal/parser.js";
import * from "https://cdn.jsdelivr.net/npm/mfm-js@0.23.3/built/internal/util.js";
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
const simpleMfmTree = mfm.parseSimple('I like the hot soup :soup:');
console.log(simpleMfmTree);
// Reverse to a MFM text from the MFM tree.
const text = mfm.toString(mfmTree);
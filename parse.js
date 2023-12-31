// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/internal/core/index.ts
function success(index, value) {
    return {
        success: true,
        value,
        index
    };
}
function failure() {
    return { success: false };
}
var Parser = class {
    constructor(handler, name) {
        this.handler = (input, index, state) => {
            if (state.trace && this.name != null) {
                const pos = `${index}`;
                console.log(`${pos.padEnd(6, " ")}enter ${this.name}`);
                const result = handler(input, index, state);
                if (result.success) {
                    const pos2 = `${index}:${result.index}`;
                    console.log(`${pos2.padEnd(6, " ")}match ${this.name}`);
                } else {
                    const pos2 = `${index}`;
                    console.log(`${pos2.padEnd(6, " ")}fail ${this.name}`);
                }
                return result;
            }
            return handler(input, index, state);
        };
        this.name = name;
    }
    map(fn) {
        return new Parser((input, index, state) => {
            const result = this.handler(input, index, state);
            if (!result.success) {
                return result;
            }
            return success(result.index, fn(result.value));
        });
    }
    text() {
        return new Parser((input, index, state) => {
            const result = this.handler(input, index, state);
            if (!result.success) {
                return result;
            }
            const text2 = input.slice(index, result.index);
            return success(result.index, text2);
        });
    }
    many(min) {
        return new Parser((input, index, state) => {
            let result;
            let latestIndex = index;
            const accum = [];
            while (latestIndex < input.length) {
                result = this.handler(input, latestIndex, state);
                if (!result.success) {
                    break;
                }
                latestIndex = result.index;
                accum.push(result.value);
            }
            if (accum.length < min) {
                return failure();
            }
            return success(latestIndex, accum);
        });
    }
    sep(separator, min) {
        if (min < 1) {
            throw new Error('"min" must be a value greater than or equal to 1.');
        }
        return seq([
            this,
            seq([
                separator,
                this
            ], 1).many(min - 1)
        ]).map((result) => [result[0], ...result[1]]);
    }
    option() {
        return alt([
            this,
            succeeded(null)
        ]);
    }
};
function str(value) {
    return new Parser((input, index, _state) => {
        if (input.length - index < value.length) {
            return failure();
        }
        if (input.substr(index, value.length) !== value) {
            return failure();
        }
        return success(index + value.length, value);
    });
}
function regexp(pattern) {
    const re = RegExp(`^(?:${pattern.source})`, pattern.flags);
    return new Parser((input, index, _state) => {
        const text2 = input.slice(index);
        const result = re.exec(text2);
        if (result == null) {
            return failure();
        }
        return success(index + result[0].length, result[0]);
    });
}
function seq(parsers, select) {
    return new Parser((input, index, state) => {
        let result;
        let latestIndex = index;
        const accum = [];
        for (let i = 0; i < parsers.length; i++) {
            result = parsers[i].handler(input, latestIndex, state);
            if (!result.success) {
                return result;
            }
            latestIndex = result.index;
            accum.push(result.value);
        }
        return success(latestIndex, select != null ? accum[select] : accum);
    });
}
function alt(parsers) {
    return new Parser((input, index, state) => {
        let result;
        for (let i = 0; i < parsers.length; i++) {
            result = parsers[i].handler(input, index, state);
            if (result.success) {
                return result;
            }
        }
        return failure();
    });
}
function succeeded(value) {
    return new Parser((_input, index, _state) => {
        return success(index, value);
    });
}
function notMatch(parser) {
    return new Parser((input, index, state) => {
        const result = parser.handler(input, index, state);
        return !result.success ? success(index, null) : failure();
    });
}
var cr = str("\r");
var lf = str("\n");
var crlf = str("\r\n");
var newline = alt([crlf, cr, lf]);
var char = new Parser((input, index, _state) => {
    if (input.length - index < 1) {
        return failure();
    }
    const value = input.charAt(index);
    return success(index + 1, value);
});
var lineBegin = new Parser((input, index, state) => {
    if (index === 0) {
        return success(index, null);
    }
    if (cr.handler(input, index - 1, state).success) {
        return success(index, null);
    }
    if (lf.handler(input, index - 1, state).success) {
        return success(index, null);
    }
    return failure();
});
var lineEnd = new Parser((input, index, state) => {
    if (index === input.length) {
        return success(index, null);
    }
    if (cr.handler(input, index, state).success) {
        return success(index, null);
    }
    if (lf.handler(input, index, state).success) {
        return success(index, null);
    }
    return failure();
});
function lazy(fn) {
    const parser = new Parser((input, index, state) => {
        parser.handler = fn().handler;
        return parser.handler(input, index, state);
    });
    return parser;
}
function createLanguage(syntaxes) {
    const rules = {};
    for (const key of Object.keys(syntaxes)) {
        rules[key] = lazy(() => {
            const parser = syntaxes[key](rules);
            if (parser == null) {
                throw new Error("syntax must return a parser.");
            }
            parser.name = key;
            return parser;
        });
    }
    return rules;
}

// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/node.ts
var blockTypes = ["quote", "search", "blockCode", "mathBlock", "center"];
function isMfmBlock(node) {
    return blockTypes.includes(node.type);
}
var QUOTE = (children) => {
    return { type: "quote", children };
};
var SEARCH = (query, content) => {
    return { type: "search", props: { query, content } };
};
var CODE_BLOCK = (code, lang) => {
    return { type: "blockCode", props: { code, lang } };
};
var MATH_BLOCK = (formula) => {
    return { type: "mathBlock", props: { formula } };
};
var CENTER = (children) => {
    return { type: "center", children };
};
var UNI_EMOJI = (value) => {
    return { type: "unicodeEmoji", props: { emoji: value } };
};
var EMOJI_CODE = (name) => {
    return { type: "emojiCode", props: { name } };
};
var BOLD = (children) => {
    return { type: "bold", children };
};
var SMALL = (children) => {
    return { type: "small", children };
};
var ITALIC = (children) => {
    return { type: "italic", children };
};
var STRIKE = (children) => {
    return { type: "strike", children };
};
var INLINE_CODE = (code) => {
    return { type: "inlineCode", props: { code } };
};
var MATH_INLINE = (formula) => {
    return { type: "mathInline", props: { formula } };
};
var MENTION = (username, host, acct) => {
    return { type: "mention", props: { username, host, acct } };
};
var HASHTAG = (value) => {
    return { type: "hashtag", props: { hashtag: value } };
};
var N_URL = (value, brackets) => {
    const node = { type: "url", props: { url: value } };
    if (brackets)
        node.props.brackets = brackets;
    return node;
};
var LINK = (silent, url, children) => {
    return { type: "link", props: { silent, url }, children };
};
var FN = (name, args, children) => {
    return { type: "fn", props: { name, args }, children };
};
var PLAIN = (text2) => {
    return { type: "plain", children: [TEXT(text2)] };
};
var TEXT = (value) => {
    return { type: "text", props: { text: value } };
};

// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/internal/util.ts
function mergeText(nodes) {
    const dest = [];
    const storedChars = [];
    function generateText() {
        if (storedChars.length > 0) {
            dest.push(TEXT(storedChars.join("")));
            storedChars.length = 0;
        }
    }
    const flatten = nodes.flat(1);
    for (const node of flatten) {
        if (typeof node === "string") {
            storedChars.push(node);
        } else if (!Array.isArray(node) && node.type === "text") {
            storedChars.push(node.props.text);
        } else {
            generateText();
            dest.push(node);
        }
    }
    generateText();
    return dest;
}
function stringifyNode(node) {
    switch (node.type) {
        case "quote": {
            return stringifyTree(node.children).split("\n").map((line) => `> ${line}`).join("\n");
        }
        case "search": {
            return node.props.content;
        }
        case "blockCode": {
            return `\`\`\`${node.props.lang ?? ""}
${node.props.code}
\`\`\``;
        }
        case "mathBlock": {
            return `\\[
${node.props.formula}
\\]`;
        }
        case "center": {
            return `<center>
${stringifyTree(node.children)}
</center>`;
        }
        case "emojiCode": {
            return `:${node.props.name}:`;
        }
        case "unicodeEmoji": {
            return node.props.emoji;
        }
        case "bold": {
            return `**${stringifyTree(node.children)}**`;
        }
        case "small": {
            return `<small>${stringifyTree(node.children)}</small>`;
        }
        case "italic": {
            return `<i>${stringifyTree(node.children)}</i>`;
        }
        case "strike": {
            return `~~${stringifyTree(node.children)}~~`;
        }
        case "inlineCode": {
            return `\`${node.props.code}\``;
        }
        case "mathInline": {
            return `\\(${node.props.formula}\\)`;
        }
        case "mention": {
            return node.props.acct;
        }
        case "hashtag": {
            return `#${node.props.hashtag}`;
        }
        case "url": {
            if (node.props.brackets) {
                return `<${node.props.url}>`;
            } else {
                return node.props.url;
            }
        }
        case "link": {
            const prefix = node.props.silent ? "?" : "";
            return `${prefix}[${stringifyTree(node.children)}](${node.props.url})`;
        }
        case "fn": {
            const argFields = Object.keys(node.props.args).map((key) => {
                const value = node.props.args[key];
                if (value === true) {
                    return key;
                } else {
                    return `${key}=${value}`;
                }
            });
            const args = argFields.length > 0 ? "." + argFields.join(",") : "";
            return `$[${node.props.name}${args} ${stringifyTree(node.children)}]`;
        }
        case "plain": {
            return `<plain>
${stringifyTree(node.children)}
</plain>`;
        }
        case "text": {
            return node.props.text;
        }
    }
    throw new Error("unknown mfm node");
}
var stringifyState;
(function (stringifyState2) {
    stringifyState2[stringifyState2["none"] = 0] = "none";
    stringifyState2[stringifyState2["inline"] = 1] = "inline";
    stringifyState2[stringifyState2["block"] = 2] = "block";
})(stringifyState || (stringifyState = {}));
function stringifyTree(nodes) {
    const dest = [];
    let state = 0;
    for (const node of nodes) {
        let pushLf = true;
        if (isMfmBlock(node)) {
            if (state === 0) {
                pushLf = false;
            }
            state = 2;
        } else {
            if (state === 0 || state === 1) {
                pushLf = false;
            }
            state = 1;
        }
        if (pushLf) {
            dest.push(TEXT("\n"));
        }
        dest.push(node);
    }
    return dest.map((n) => stringifyNode(n)).join("");
}

// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/internal/parser.ts
var space = regexp(/[\u0020\u3000\t]/);
var alphaAndNum = regexp(/[a-z0-9]/i);
var newLine = alt([crlf, cr, lf]);
function seqOrText(parsers) {
    return new Parser((input, index, state) => {
        const accum = [];
        let latestIndex = index;
        for (let i = 0; i < parsers.length; i++) {
            const result = parsers[i].handler(input, latestIndex, state);
            if (!result.success) {
                if (latestIndex === index) {
                    return failure();
                } else {
                    return success(latestIndex, input.slice(index, latestIndex));
                }
            }
            accum.push(result.value);
            latestIndex = result.index;
        }
        return success(latestIndex, accum);
    });
}
var notLinkLabel = new Parser((_input, index, state) => {
    return !state.linkLabel ? success(index, null) : failure();
});
var nestable = new Parser((_input, index, state) => {
    return state.depth < state.nestLimit ? success(index, null) : failure();
});
function nest(parser, fallback) {
    const inner = alt([
        seq([nestable, parser], 1),
        fallback != null ? fallback : char
    ]);
    return new Parser((input, index, state) => {
        state.depth++;
        const result = inner.handler(input, index, state);
        state.depth--;
        return result;
    });
}
var language = createLanguage({
    fullParser: (r) => {
        return r.full.many(0);
    },
    simpleParser: (r) => {
        return r.simple.many(0);
    },
    full: (r) => {
        return alt([
            r.unicodeEmoji,
            r.centerTag,
            r.smallTag,
            r.plainTag,
            r.boldTag,
            r.italicTag,
            r.strikeTag,
            r.urlAlt,
            r.big,
            r.boldAsta,
            r.italicAsta,
            r.boldUnder,
            r.italicUnder,
            r.codeBlock,
            r.inlineCode,
            r.quote,
            r.mathBlock,
            r.mathInline,
            r.strikeWave,
            r.fn,
            r.mention,
            r.hashtag,
            r.emojiCode,
            r.link,
            r.url,
            r.search,
            r.text
        ]);
    },
    simple: (r) => {
        return alt([
            r.unicodeEmoji,
            r.emojiCode,
            r.text
        ]);
    },
    inline: (r) => {
        return alt([
            r.unicodeEmoji,
            r.smallTag,
            r.plainTag,
            r.boldTag,
            r.italicTag,
            r.strikeTag,
            r.urlAlt,
            r.big,
            r.boldAsta,
            r.italicAsta,
            r.boldUnder,
            r.italicUnder,
            r.inlineCode,
            r.mathInline,
            r.strikeWave,
            r.fn,
            r.mention,
            r.hashtag,
            r.emojiCode,
            r.link,
            r.url,
            r.text
        ]);
    },
    quote: (r) => {
        const lines = seq([
            str(">"),
            space.option(),
            seq([notMatch(newLine), char], 1).many(0).text()
        ], 2).sep(newLine, 1);
        const parser = seq([
            newLine.option(),
            newLine.option(),
            lineBegin,
            lines,
            newLine.option(),
            newLine.option()
        ], 3);
        return new Parser((input, index, state) => {
            let result;
            result = parser.handler(input, index, state);
            if (!result.success) {
                return result;
            }
            const contents = result.value;
            const quoteIndex = result.index;
            if (contents.length === 1 && contents[0].length === 0) {
                return failure();
            }
            const contentParser = nest(r.fullParser).many(0);
            result = contentParser.handler(contents.join("\n"), 0, state);
            if (!result.success) {
                return result;
            }
            return success(quoteIndex, QUOTE(mergeText(result.value)));
        });
    },
    codeBlock: (r) => {
        const mark = str("```");
        return seq([
            newLine.option(),
            lineBegin,
            mark,
            seq([notMatch(newLine), char], 1).many(0),
            newLine,
            seq([notMatch(seq([newLine, mark, lineEnd])), char], 1).many(1),
            newLine,
            mark,
            lineEnd,
            newLine.option()
        ]).map((result) => {
            const lang = result[3].join("").trim();
            const code = result[5].join("");
            return CODE_BLOCK(code, lang.length > 0 ? lang : null);
        });
    },
    mathBlock: (r) => {
        const open = str("\\[");
        const close = str("\\]");
        return seq([
            newLine.option(),
            lineBegin,
            open,
            newLine.option(),
            seq([notMatch(seq([newLine.option(), close])), char], 1).many(1),
            newLine.option(),
            close,
            lineEnd,
            newLine.option()
        ]).map((result) => {
            const formula = result[4].join("");
            return MATH_BLOCK(formula);
        });
    },
    centerTag: (r) => {
        const open = str("<center>");
        const close = str("</center>");
        return seq([
            newLine.option(),
            lineBegin,
            open,
            newLine.option(),
            seq([notMatch(seq([newLine.option(), close])), nest(r.inline)], 1).many(1),
            newLine.option(),
            close,
            lineEnd,
            newLine.option()
        ]).map((result) => {
            return CENTER(mergeText(result[4]));
        });
    },
    big: (r) => {
        const mark = str("***");
        return seqOrText([
            mark,
            seq([notMatch(mark), nest(r.inline)], 1).many(1),
            mark
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return FN("tada", {}, mergeText(result[1]));
        });
    },
    boldAsta: (r) => {
        const mark = str("**");
        return seqOrText([
            mark,
            seq([notMatch(mark), nest(r.inline)], 1).many(1),
            mark
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return BOLD(mergeText(result[1]));
        });
    },
    boldTag: (r) => {
        const open = str("<b>");
        const close = str("</b>");
        return seqOrText([
            open,
            seq([notMatch(close), nest(r.inline)], 1).many(1),
            close
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return BOLD(mergeText(result[1]));
        });
    },
    boldUnder: (r) => {
        const mark = str("__");
        return seq([
            mark,
            alt([alphaAndNum, space]).many(1),
            mark
        ]).map((result) => BOLD(mergeText(result[1])));
    },
    smallTag: (r) => {
        const open = str("<small>");
        const close = str("</small>");
        return seqOrText([
            open,
            seq([notMatch(close), nest(r.inline)], 1).many(1),
            close
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return SMALL(mergeText(result[1]));
        });
    },
    italicTag: (r) => {
        const open = str("<i>");
        const close = str("</i>");
        return seqOrText([
            open,
            seq([notMatch(close), nest(r.inline)], 1).many(1),
            close
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return ITALIC(mergeText(result[1]));
        });
    },
    italicAsta: (r) => {
        const mark = str("*");
        const parser = seq([
            mark,
            alt([alphaAndNum, space]).many(1),
            mark
        ]);
        return new Parser((input, index, state) => {
            const result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const beforeStr = input.slice(0, index);
            if (/[a-z0-9]$/i.test(beforeStr)) {
                return failure();
            }
            return success(result.index, ITALIC(mergeText(result.value[1])));
        });
    },
    italicUnder: (r) => {
        const mark = str("_");
        const parser = seq([
            mark,
            alt([alphaAndNum, space]).many(1),
            mark
        ]);
        return new Parser((input, index, state) => {
            const result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const beforeStr = input.slice(0, index);
            if (/[a-z0-9]$/i.test(beforeStr)) {
                return failure();
            }
            return success(result.index, ITALIC(mergeText(result.value[1])));
        });
    },
    strikeTag: (r) => {
        const open = str("<s>");
        const close = str("</s>");
        return seqOrText([
            open,
            seq([notMatch(close), nest(r.inline)], 1).many(1),
            close
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return STRIKE(mergeText(result[1]));
        });
    },
    strikeWave: (r) => {
        const mark = str("~~");
        return seqOrText([
            mark,
            seq([notMatch(alt([mark, newLine])), nest(r.inline)], 1).many(1),
            mark
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            return STRIKE(mergeText(result[1]));
        });
    },
    unicodeEmoji: (r) => {
        let twemojiRegex = /(?:\ud83d\udc68\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83e\uddd1\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83e\uddd1\ud83c[\udffc-\udfff]|\ud83e\uddd1\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83e\uddd1\ud83c[\udffb\udffd-\udfff]|\ud83e\uddd1\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83e\uddd1\ud83c[\udffb\udffc\udffe\udfff]|\ud83e\uddd1\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83e\uddd1\ud83c[\udffb-\udffd\udfff]|\ud83e\uddd1\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83e\uddd1\ud83c[\udffb-\udffe]|\ud83d\udc68\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffc-\udfff]|\ud83d\udc68\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffd-\udfff]|\ud83d\udc68\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffc\udffe\udfff]|\ud83d\udc68\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffd\udfff]|\ud83d\udc68\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc68\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffe]|\ud83d\udc69\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffc-\udfff]|\ud83d\udc69\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffc-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffd-\udfff]|\ud83d\udc69\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb\udffd-\udfff]|\ud83d\udc69\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb\udffc\udffe\udfff]|\ud83d\udc69\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb\udffc\udffe\udfff]|\ud83d\udc69\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffd\udfff]|\ud83d\udc69\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb-\udffd\udfff]|\ud83d\udc69\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc68\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83d\udc69\ud83c[\udffb-\udfff]|\ud83d\udc69\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc68\ud83c[\udffb-\udffe]|\ud83d\udc69\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83d\udc69\ud83c[\udffb-\udffe]|\ud83e\uddd1\ud83c\udffb\u200d\u2764\ufe0f\u200d\ud83e\uddd1\ud83c[\udffc-\udfff]|\ud83e\uddd1\ud83c\udffb\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83e\uddd1\ud83c\udffc\u200d\u2764\ufe0f\u200d\ud83e\uddd1\ud83c[\udffb\udffd-\udfff]|\ud83e\uddd1\ud83c\udffc\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83e\uddd1\ud83c\udffd\u200d\u2764\ufe0f\u200d\ud83e\uddd1\ud83c[\udffb\udffc\udffe\udfff]|\ud83e\uddd1\ud83c\udffd\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83e\uddd1\ud83c\udffe\u200d\u2764\ufe0f\u200d\ud83e\uddd1\ud83c[\udffb-\udffd\udfff]|\ud83e\uddd1\ud83c\udffe\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83e\uddd1\ud83c\udfff\u200d\u2764\ufe0f\u200d\ud83e\uddd1\ud83c[\udffb-\udffe]|\ud83e\uddd1\ud83c\udfff\u200d\ud83e\udd1d\u200d\ud83e\uddd1\ud83c[\udffb-\udfff]|\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d\udc68|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d\udc8b\u200d\ud83d[\udc68\udc69]|\ud83e\udef1\ud83c\udffb\u200d\ud83e\udef2\ud83c[\udffc-\udfff]|\ud83e\udef1\ud83c\udffc\u200d\ud83e\udef2\ud83c[\udffb\udffd-\udfff]|\ud83e\udef1\ud83c\udffd\u200d\ud83e\udef2\ud83c[\udffb\udffc\udffe\udfff]|\ud83e\udef1\ud83c\udffe\u200d\ud83e\udef2\ud83c[\udffb-\udffd\udfff]|\ud83e\udef1\ud83c\udfff\u200d\ud83e\udef2\ud83c[\udffb-\udffe]|\ud83d\udc68\u200d\u2764\ufe0f\u200d\ud83d\udc68|\ud83d\udc69\u200d\u2764\ufe0f\u200d\ud83d[\udc68\udc69]|\ud83e\uddd1\u200d\ud83e\udd1d\u200d\ud83e\uddd1|\ud83d\udc6b\ud83c[\udffb-\udfff]|\ud83d\udc6c\ud83c[\udffb-\udfff]|\ud83d\udc6d\ud83c[\udffb-\udfff]|\ud83d\udc8f\ud83c[\udffb-\udfff]|\ud83d\udc91\ud83c[\udffb-\udfff]|\ud83e\udd1d\ud83c[\udffb-\udfff]|\ud83d[\udc6b-\udc6d\udc8f\udc91]|\ud83e\udd1d)|(?:\ud83d[\udc68\udc69]|\ud83e\uddd1)(?:\ud83c[\udffb-\udfff])?\u200d(?:\u2695\ufe0f|\u2696\ufe0f|\u2708\ufe0f|\ud83c[\udf3e\udf73\udf7c\udf84\udf93\udfa4\udfa8\udfeb\udfed]|\ud83d[\udcbb\udcbc\udd27\udd2c\ude80\ude92]|\ud83e[\uddaf-\uddb3\uddbc\uddbd])|(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75]|\u26f9)((?:\ud83c[\udffb-\udfff]|\ufe0f)\u200d[\u2640\u2642]\ufe0f)|(?:\ud83c[\udfc3\udfc4\udfca]|\ud83d[\udc6e\udc70\udc71\udc73\udc77\udc81\udc82\udc86\udc87\ude45-\ude47\ude4b\ude4d\ude4e\udea3\udeb4-\udeb6]|\ud83e[\udd26\udd35\udd37-\udd39\udd3d\udd3e\uddb8\uddb9\uddcd-\uddcf\uddd4\uddd6-\udddd])(?:\ud83c[\udffb-\udfff])?\u200d[\u2640\u2642]\ufe0f|(?:\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc68\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d\udc66\u200d\ud83d\udc66|\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83c\udff3\ufe0f\u200d\u26a7\ufe0f|\ud83c\udff3\ufe0f\u200d\ud83c\udf08|\ud83d\ude36\u200d\ud83c\udf2b\ufe0f|\u2764\ufe0f\u200d\ud83d\udd25|\u2764\ufe0f\u200d\ud83e\ude79|\ud83c\udff4\u200d\u2620\ufe0f|\ud83d\udc15\u200d\ud83e\uddba|\ud83d\udc3b\u200d\u2744\ufe0f|\ud83d\udc41\u200d\ud83d\udde8|\ud83d\udc68\u200d\ud83d[\udc66\udc67]|\ud83d\udc69\u200d\ud83d[\udc66\udc67]|\ud83d\udc6f\u200d\u2640\ufe0f|\ud83d\udc6f\u200d\u2642\ufe0f|\ud83d\ude2e\u200d\ud83d\udca8|\ud83d\ude35\u200d\ud83d\udcab|\ud83e\udd3c\u200d\u2640\ufe0f|\ud83e\udd3c\u200d\u2642\ufe0f|\ud83e\uddde\u200d\u2640\ufe0f|\ud83e\uddde\u200d\u2642\ufe0f|\ud83e\udddf\u200d\u2640\ufe0f|\ud83e\udddf\u200d\u2642\ufe0f|\ud83d\udc08\u200d\u2b1b)|[#*0-9]\ufe0f?\u20e3|(?:[©®\u2122\u265f]\ufe0f)|(?:\ud83c[\udc04\udd70\udd71\udd7e\udd7f\ude02\ude1a\ude2f\ude37\udf21\udf24-\udf2c\udf36\udf7d\udf96\udf97\udf99-\udf9b\udf9e\udf9f\udfcd\udfce\udfd4-\udfdf\udff3\udff5\udff7]|\ud83d[\udc3f\udc41\udcfd\udd49\udd4a\udd6f\udd70\udd73\udd76-\udd79\udd87\udd8a-\udd8d\udda5\udda8\uddb1\uddb2\uddbc\uddc2-\uddc4\uddd1-\uddd3\udddc-\uddde\udde1\udde3\udde8\uddef\uddf3\uddfa\udecb\udecd-\udecf\udee0-\udee5\udee9\udef0\udef3]|[\u203c\u2049\u2139\u2194-\u2199\u21a9\u21aa\u231a\u231b\u2328\u23cf\u23ed-\u23ef\u23f1\u23f2\u23f8-\u23fa\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262a\u262e\u262f\u2638-\u263a\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2692-\u2697\u2699\u269b\u269c\u26a0\u26a1\u26a7\u26aa\u26ab\u26b0\u26b1\u26bd\u26be\u26c4\u26c5\u26c8\u26cf\u26d1\u26d3\u26d4\u26e9\u26ea\u26f0-\u26f5\u26f8\u26fa\u26fd\u2702\u2708\u2709\u270f\u2712\u2714\u2716\u271d\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u2764\u27a1\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299])(?:\ufe0f|(?!\ufe0e))|(?:(?:\ud83c[\udfcb\udfcc]|\ud83d[\udd74\udd75\udd90]|[\u261d\u26f7\u26f9\u270c\u270d])(?:\ufe0f|(?!\ufe0e))|(?:\ud83c[\udf85\udfc2-\udfc4\udfc7\udfca]|\ud83d[\udc42\udc43\udc46-\udc50\udc66-\udc69\udc6e\udc70-\udc78\udc7c\udc81-\udc83\udc85-\udc87\udcaa\udd7a\udd95\udd96\ude45-\ude47\ude4b-\ude4f\udea3\udeb4-\udeb6\udec0\udecc]|\ud83e[\udd0c\udd0f\udd18-\udd1c\udd1e\udd1f\udd26\udd30-\udd39\udd3d\udd3e\udd77\uddb5\uddb6\uddb8\uddb9\uddbb\uddcd-\uddcf\uddd1-\udddd\udec3-\udec5\udef0-\udef6]|[\u270a\u270b]))(?:\ud83c[\udffb-\udfff])?|(?:\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc73\udb40\udc63\udb40\udc74\udb40\udc7f|\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc77\udb40\udc6c\udb40\udc73\udb40\udc7f|\ud83c\udde6\ud83c[\udde8-\uddec\uddee\uddf1\uddf2\uddf4\uddf6-\uddfa\uddfc\uddfd\uddff]|\ud83c\udde7\ud83c[\udde6\udde7\udde9-\uddef\uddf1-\uddf4\uddf6-\uddf9\uddfb\uddfc\uddfe\uddff]|\ud83c\udde8\ud83c[\udde6\udde8\udde9\uddeb-\uddee\uddf0-\uddf5\uddf7\uddfa-\uddff]|\ud83c\udde9\ud83c[\uddea\uddec\uddef\uddf0\uddf2\uddf4\uddff]|\ud83c\uddea\ud83c[\udde6\udde8\uddea\uddec\udded\uddf7-\uddfa]|\ud83c\uddeb\ud83c[\uddee-\uddf0\uddf2\uddf4\uddf7]|\ud83c\uddec\ud83c[\udde6\udde7\udde9-\uddee\uddf1-\uddf3\uddf5-\uddfa\uddfc\uddfe]|\ud83c\udded\ud83c[\uddf0\uddf2\uddf3\uddf7\uddf9\uddfa]|\ud83c\uddee\ud83c[\udde8-\uddea\uddf1-\uddf4\uddf6-\uddf9]|\ud83c\uddef\ud83c[\uddea\uddf2\uddf4\uddf5]|\ud83c\uddf0\ud83c[\uddea\uddec-\uddee\uddf2\uddf3\uddf5\uddf7\uddfc\uddfe\uddff]|\ud83c\uddf1\ud83c[\udde6-\udde8\uddee\uddf0\uddf7-\uddfb\uddfe]|\ud83c\uddf2\ud83c[\udde6\udde8-\udded\uddf0-\uddff]|\ud83c\uddf3\ud83c[\udde6\udde8\uddea-\uddec\uddee\uddf1\uddf4\uddf5\uddf7\uddfa\uddff]|\ud83c\uddf4\ud83c\uddf2|\ud83c\uddf5\ud83c[\udde6\uddea-\udded\uddf0-\uddf3\uddf7-\uddf9\uddfc\uddfe]|\ud83c\uddf6\ud83c\udde6|\ud83c\uddf7\ud83c[\uddea\uddf4\uddf8\uddfa\uddfc]|\ud83c\uddf8\ud83c[\udde6-\uddea\uddec-\uddf4\uddf7-\uddf9\uddfb\uddfd-\uddff]|\ud83c\uddf9\ud83c[\udde6\udde8\udde9\uddeb-\udded\uddef-\uddf4\uddf7\uddf9\uddfb\uddfc\uddff]|\ud83c\uddfa\ud83c[\udde6\uddec\uddf2\uddf3\uddf8\uddfe\uddff]|\ud83c\uddfb\ud83c[\udde6\udde8\uddea\uddec\uddee\uddf3\uddfa]|\ud83c\uddfc\ud83c[\uddeb\uddf8]|\ud83c\uddfd\ud83c\uddf0|\ud83c\uddfe\ud83c[\uddea\uddf9]|\ud83c\uddff\ud83c[\udde6\uddf2\uddfc]|\ud83c[\udccf\udd8e\udd91-\udd9a\udde6-\uddff\ude01\ude32-\ude36\ude38-\ude3a\ude50\ude51\udf00-\udf20\udf2d-\udf35\udf37-\udf7c\udf7e-\udf84\udf86-\udf93\udfa0-\udfc1\udfc5\udfc6\udfc8\udfc9\udfcf-\udfd3\udfe0-\udff0\udff4\udff8-\udfff]|\ud83d[\udc00-\udc3e\udc40\udc44\udc45\udc51-\udc65\udc6a\udc6f\udc79-\udc7b\udc7d-\udc80\udc84\udc88-\udc8e\udc90\udc92-\udca9\udcab-\udcfc\udcff-\udd3d\udd4b-\udd4e\udd50-\udd67\udda4\uddfb-\ude44\ude48-\ude4a\ude80-\udea2\udea4-\udeb3\udeb7-\udebf\udec1-\udec5\uded0-\uded2\uded5-\uded7\udedd-\udedf\udeeb\udeec\udef4-\udefc\udfe0-\udfeb\udff0]|\ud83e[\udd0d\udd0e\udd10-\udd17\udd20-\udd25\udd27-\udd2f\udd3a\udd3c\udd3f-\udd45\udd47-\udd76\udd78-\uddb4\uddb7\uddba\uddbc-\uddcc\uddd0\uddde-\uddff\ude70-\ude74\ude78-\ude7c\ude80-\ude86\ude90-\udeac\udeb0-\udeba\udec0-\udec2\uded0-\uded9\udee0-\udee7]|[\u23e9-\u23ec\u23f0\u23f3\u267e\u26ce\u2705\u2728\u274c\u274e\u2753-\u2755\u2795-\u2797\u27b0\u27bf\ue50a])|\ufe0f/g
        const emoji = RegExp(twemojiRegex.source);
        return regexp(emoji).map((content) => UNI_EMOJI(content));
    },
    plainTag: (r) => {
        const open = str("<plain>");
        const close = str("</plain>");
        return seq([
            open,
            newLine.option(),
            seq([
                notMatch(seq([newLine.option(), close])),
                char
            ], 1).many(1).text(),
            newLine.option(),
            close
        ], 2).map((result) => PLAIN(result));
    },
    fn: (r) => {
        const fnName = new Parser((input, index, state) => {
            const result = regexp(/[a-z0-9_]+/i).handler(input, index, state);
            if (!result.success) {
                return result;
            }
            if (state.fnNameList != null && !state.fnNameList.includes(result.value)) {
                return failure();
            }
            return success(result.index, result.value);
        });
        const arg = seq([
            regexp(/[a-z0-9_]+/i),
            seq([
                str("="),
                regexp(/[a-z0-9_.]+/i)
            ], 1).option()
        ]).map((result) => {
            return {
                k: result[0],
                v: result[1] != null ? result[1] : true
            };
        });
        const args = seq([
            str("."),
            arg.sep(str(","), 1)
        ], 1).map((pairs) => {
            const result = {};
            for (const pair of pairs) {
                result[pair.k] = pair.v;
            }
            return result;
        });
        const fnClose = str("]");
        return seqOrText([
            str("$["),
            fnName,
            args.option(),
            str(" "),
            seq([notMatch(fnClose), nest(r.inline)], 1).many(1),
            fnClose
        ]).map((result) => {
            if (typeof result === "string")
                return result;
            const name = result[1];
            const args2 = result[2] || {};
            const content = result[4];
            return FN(name, args2, mergeText(content));
        });
    },
    inlineCode: (r) => {
        const mark = str("`");
        return seq([
            mark,
            seq([
                notMatch(alt([mark, str("´"), newLine])),
                char
            ], 1).many(1),
            mark
        ]).map((result) => INLINE_CODE(result[1].join("")));
    },
    mathInline: (r) => {
        const open = str("\\(");
        const close = str("\\)");
        return seq([
            open,
            seq([
                notMatch(alt([close, newLine])),
                char
            ], 1).many(1),
            close
        ]).map((result) => MATH_INLINE(result[1].join("")));
    },
    mention: (r) => {
        const parser = seq([
            notLinkLabel,
            str("@"),
            regexp(/[a-z0-9_-]+/i),
            seq([
                str("@"),
                regexp(/[a-z0-9_.-]+/i)
            ], 1).option()
        ]);
        return new Parser((input, index, state) => {
            let result;
            result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const beforeStr = input.slice(0, index);
            if (/[a-z0-9]$/i.test(beforeStr)) {
                return failure();
            }
            let invalidMention = false;
            const resultIndex = result.index;
            const username = result.value[2];
            const hostname = result.value[3];
            let modifiedHost = hostname;
            if (hostname != null) {
                result = /[.-]+$/.exec(hostname);
                if (result != null) {
                    modifiedHost = hostname.slice(0, -1 * result[0].length);
                    if (modifiedHost.length === 0) {
                        invalidMention = true;
                        modifiedHost = null;
                    }
                }
            }
            let modifiedName = username;
            result = /-+$/.exec(username);
            if (result != null) {
                if (modifiedHost == null) {
                    modifiedName = username.slice(0, -1 * result[0].length);
                } else {
                    invalidMention = true;
                }
            }
            if (modifiedName.length === 0 || modifiedName[0] === "-") {
                invalidMention = true;
            }
            if (modifiedHost != null && /^[.-]/.test(modifiedHost)) {
                invalidMention = true;
            }
            if (invalidMention) {
                return success(resultIndex, input.slice(index, resultIndex));
            }
            const acct = modifiedHost != null ? `@${modifiedName}@${modifiedHost}` : `@${modifiedName}`;
            return success(index + acct.length, MENTION(modifiedName, modifiedHost, acct));
        });
    },
    hashtag: (r) => {
        const mark = str("#");
        const hashTagChar = seq([
            notMatch(alt([regexp(/[ \u3000\t.,!?'"#:/[\]【】()「」（）<>]/), space, newLine])),
            char
        ], 1);
        const innerItem = lazy(() => alt([
            seq([
                str("("),
                nest(innerItem, hashTagChar).many(0),
                str(")")
            ]),
            seq([
                str("["),
                nest(innerItem, hashTagChar).many(0),
                str("]")
            ]),
            seq([
                str("「"),
                nest(innerItem, hashTagChar).many(0),
                str("」")
            ]),
            seq([
                str("（"),
                nest(innerItem, hashTagChar).many(0),
                str("）")
            ]),
            hashTagChar
        ]));
        const parser = seq([
            notLinkLabel,
            mark,
            innerItem.many(1).text()
        ], 2);
        return new Parser((input, index, state) => {
            const result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const beforeStr = input.slice(0, index);
            if (/[a-z0-9]$/i.test(beforeStr)) {
                return failure();
            }
            const resultIndex = result.index;
            const resultValue = result.value;
            if (/^[0-9]+$/.test(resultValue)) {
                return failure();
            }
            return success(resultIndex, HASHTAG(resultValue));
        });
    },
    emojiCode: (r) => {
        const side = notMatch(regexp(/[a-z0-9]/i));
        const mark = str(":");
        const parser = seq([
            alt([lineBegin, side]),
            mark,
            regexp(/[a-z0-9_+-]+/i),
            mark,
            alt([lineEnd, side])
        ], 2);
        return new Parser((input, index, state) => {
            const result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            if (state.emojiCodeList != null && !state.emojiCodeList.includes(result.value)) {
                return failure();
            }
            return success(result.index, EMOJI_CODE(result.value));
        });
    },
    link: (r) => {
        const labelInline = new Parser((input, index, state) => {
            state.linkLabel = true;
            const result = r.inline.handler(input, index, state);
            state.linkLabel = false;
            return result;
        });
        const closeLabel = str("]");
        return seq([
            notLinkLabel,
            alt([str("?["), str("[")]),
            seq([
                notMatch(alt([closeLabel, newLine])),
                nest(labelInline)
            ], 1).many(1),
            closeLabel,
            str("("),
            alt([r.urlAlt, r.url]),
            str(")")
        ]).map((result) => {
            const silent = result[1] === "?[";
            const label = result[2];
            const url = result[5];
            return LINK(silent, url.props.url, mergeText(label));
        });
    },
    url: (r) => {
        const urlChar = regexp(/[.,a-z0-9_/:%#@$&?!~=+-]/i);
        const innerItem = lazy(() => alt([
            seq([
                str("("),
                nest(innerItem, urlChar).many(0),
                str(")")
            ]),
            seq([
                str("["),
                nest(innerItem, urlChar).many(0),
                str("]")
            ]),
            urlChar
        ]));
        const parser = seq([
            notLinkLabel,
            regexp(/https?:\/\//),
            innerItem.many(1).text()
        ]);
        return new Parser((input, index, state) => {
            let result;
            result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const resultIndex = result.index;
            let modifiedIndex = resultIndex;
            const schema = result.value[1];
            let content = result.value[2];
            result = /[.,]+$/.exec(content);
            if (result != null) {
                modifiedIndex -= result[0].length;
                content = content.slice(0, -1 * result[0].length);
                if (content.length === 0) {
                    return success(resultIndex, input.slice(index, resultIndex));
                }
            }
            return success(modifiedIndex, N_URL(schema + content, false));
        });
    },
    urlAlt: (r) => {
        const open = str("<");
        const close = str(">");
        const parser = seq([
            notLinkLabel,
            open,
            regexp(/https?:\/\//),
            seq([notMatch(alt([close, space])), char], 1).many(1),
            close
        ]).text();
        return new Parser((input, index, state) => {
            const result = parser.handler(input, index, state);
            if (!result.success) {
                return failure();
            }
            const text2 = result.value.slice(1, result.value.length - 1);
            return success(result.index, N_URL(text2, true));
        });
    },
    search: (r) => {
        const button = alt([
            regexp(/\[(検索|search)\]/i),
            regexp(/(検索|search)/i)
        ]);
        return seq([
            newLine.option(),
            lineBegin,
            seq([
                notMatch(alt([
                    newLine,
                    seq([space, button, lineEnd])
                ])),
                char
            ], 1).many(1),
            space,
            button,
            lineEnd,
            newLine.option()
        ]).map((result) => {
            const query = result[2].join("");
            return SEARCH(query, `${query}${result[3]}${result[4]}`);
        });
    },
    text: (r) => char
});

// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/internal/index.ts
function fullParser(input, opts) {
    const result = language.fullParser.handler(input, 0, {
        nestLimit: opts.nestLimit != null ? opts.nestLimit : 20,
        fnNameList: opts.fnNameList,
        emojiCodeList: opts.emojiCodeList,
        depth: 0,
        linkLabel: false,
        trace: false
    });
    return mergeText(result.value);
}
function simpleParser(input) {
    const result = language.simpleParser.handler(input, 0, {});
    return mergeText(result.value);
}

// remote-resource:https://raw.githubusercontent.com/JPCC-p/editor/master/api.ts
function parse(input, opts = {}) {
    const nodes = fullParser(input, {
        fnNameList: opts.fnNameList,
        emojiCodeList: opts.emojiCodeList,
        nestLimit: opts.nestLimit
    });
    return nodes;
}
function parseSimple(input) {
    const nodes = simpleParser(input);
    return nodes;
}
function toString(node) {
    if (Array.isArray(node)) {
        return stringifyTree(node);
    } else {
        return stringifyNode(node);
    }
}
const log = require('log4js').getLogger('asd')
const dm = require('./data_modifications')(log);
// function asd(a, b) {
//     return a+b;
// }

// for (let i = 0 ; i < 100 ; i++) {
//     console.log(asd(i, i));
// }


// testing trees walk

const obj1 = {
    a: {
        a: {
            c: "aac3"
        },
        b: {
            c: "abc3" 
        },
        c: "ac2"
    },
    b: {
        c: "bc2"
    },
    c: "c1"
}

//a -> a -> c
//a -> b -> c
//a -> c
//b -> c
//c

// objWalk = (obj, payloadFn) = {
//     for el of Object.keys(obj) {

//     }
// }

jArr = dm.jsonToStringArray(obj1,true);

console.log(jArr) //.map(console.log)

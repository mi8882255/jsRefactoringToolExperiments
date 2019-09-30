const  fs = require('fs');
const  path = require('path');
const { promisify } = require('util');

// function promisify(functionWithCB) {
//     return async (...args) => {
//         return new Promise((resolve,reject)=>{
//             functionWithCB(...args, (err,result)=>{
//                 if (err) {reject(err)};

//                 resolve(result)
//             });
//         })
//     }
// }

const pReaddir = promisify(fs.readdir);

(async()=>{
    console.log(await pReaddir(__dirname))
})()

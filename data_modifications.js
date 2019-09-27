
// noinspection JSUnusedLocalSymbols
module.exports = (log) => {
    const impl = {
        getImmutableObject : obj => JSON.parse(JSON.stringify(obj)),
        getObjByPath : (obj, path) => {
            return path.reduce((acc, val) => acc[val], impl.getImmutableObject(obj));
        },
        // getObjByPathMutable : (obj, path) => {
        //     return path.reduce((acc, val) => acc[val], obj);
        // },
        recursiveObjWalk : (obj, payloadFn, path = []) => {
            for (let key of Object.keys(obj)) {
              if (!(obj[key] && typeof obj[key] === "object")) {
                if (payloadFn(obj[key], path, key)) {
                  continue;
                } else {
                  return;
                }
              }
              impl.recursiveObjWalk(obj[key], payloadFn, [...path, key]);
            }
        },
        diff: (objMask, objSrc) => {
        	  // log.info(objMask, objSrc);

            const result = [];
            objMask = { root: impl.getImmutableObject(objMask) };
            objSrc = { root: impl.getImmutableObject(objSrc) };

            const payloadFn = (val, path, key) => {
              let objByPath = impl.getObjByPath(objMask, path);
              if (!objByPath) {
                return false;
              }
              objByPath = objByPath[key];
      
              if ((objByPath || "").toString() !== (val || "").toString()) {
                //  console.log({val, objByPath, key});
                result.push({
                  path: path,
                  mask: impl.getObjByPath(objMask, path),
                  obj: impl.getObjByPath(objSrc, path)
                });
                return false;
              }
              return true;
            };

            impl.recursiveObjWalk(objSrc, payloadFn);

            return result;
          },
          mutate : (ast, mask, template) => {
        	  // log.info({mask, template});
            let debug = [];
            const diffMaskAst = impl.diff(mask, ast);
            debug.push(JSON.stringify(diffMaskAst));
            //[{route,objMask,objAst}]

            debug.push(JSON.stringify(template));
            let str1 = JSON.stringify(template);
            for (let diffEl of diffMaskAst) {
              // debug += JSON.stringify(diffEl.mask) + '   \n    ';
              str1 = str1.split(JSON.stringify(diffEl.mask)).join(JSON.stringify(diffEl.obj));
            }
            template = JSON.parse(str1);
            //  const payloadFn = (val, path, key) => {
            //      for (diffEl of diffMaskAst) {
            //          if (JSON.stringify(diffEl.mask) === JSON.stringify(val)) {
            //              getObjByPathMutable(template,[...path]) = diffEl.obj;
            //          }
            //      }
            //      return true;
            //  };
            //  recursiveObjWalk(template,payloadFn);
            return { debug, template };
          },
          recursiveCleanAst : (astObj) => {
            delete astObj.start;
            delete astObj.end;
	          delete astObj.loc;
        
            for (let key of Object.keys(astObj)) {
              if (astObj[key] && typeof astObj[key] === "object") {
                impl.recursiveCleanAst(astObj[key]);
              }
            }
          }
    };
    
    return impl;
};
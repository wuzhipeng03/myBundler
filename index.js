const detective = require('detective')
const resolve = require('resolve').sync
const fs = require('fs')
const path = require('path')


let ID = 0

function createModuleObject(filepath) {
    const source = fs.readFileSync(filepath, 'utf-8');
    const requires = detective(source);
    const id = ID++
    return {id, filepath, source, requires}
}


function getModules(entry) {
    const rootModule = createModuleObject(entry)
    const modules = [rootModule]

    // Iterate over the modules, even when new
    // ones are being added
    for (const module of modules) {
        module.map = {} // Where we will keep the module maps

        module.requires.forEach(dependency => {
            const basedir = path.dirname(module.filepath)
            const dependencyPath = resolve(dependency, {basedir})
            // console.log( dependencyPath );
            const dependencyObject = createModuleObject(dependencyPath)

            module.map[dependency] = dependencyObject.id
            modules.push(dependencyObject)
        })
    }
    return modules
}
// console.log( getModules('./dist/entry.js') );


function pack(modules) {
    const modulesSource = modules.map(module =>
        `${module.id}: {
      factory: (module, require) => {
        ${module.source}
      },
      map: ${JSON.stringify(module.map)}
    }`
    ).join()

    // console.log(modulesSource);

    return `(modules => {
     function require (id) {
          const { factory, map } = modules[id]
          const localRequire = function(name) {
             return require(map[name]);
          }
          const module = { exports: {} }
    
          factory(module, localRequire)
    
          return module.exports
    }

    require(0)
  })({ ${modulesSource} })`
}

fs.writeFile("bundle.js", pack(getModules('./dist/entry.js')), function (err) {
    if (err) {
        return console.log(err);
    }
    console.log("The file was saved!");
});

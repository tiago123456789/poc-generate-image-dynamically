const fs = require("fs")

const getLastModification = (pathFile) => {
    const output = fs.statSync(pathFile);
    return output.mtime;
}

module.exports = {
    getLastModification
}

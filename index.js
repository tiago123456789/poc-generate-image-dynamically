const express = require("express")
const fs = require("fs");
const crypto = require('crypto')
const GenerateDynamicImage = require("./GenerateDynamicImage");
const { getLastModification } = require("./FileUtil");
const { getEtag, enableHTTPCache } = require("./CacheUtil");
const { generateToken } = require("./HashUtil");
const app = express();

app.use(express.json())

const extractDomain = (req) => {
    return req.headers.referer
        .replace(/(http|https)/, "")
        .replace(/:\/\//, "")
        .replace(/:([0-9])+\/$/, "")
}

const hasPermission = (req, res, next) => {
    const domain = extractDomain(req)
    const token = generateToken(domain)
    const tokenClient = req.params.token || null
    if (tokenClient !== token) {
        return res.status(500).send("Invalid")
    }
    return next();
}

app.get("/token/generate", (req, res) => {
    const domain = extractDomain(req)
    const token = generateToken(domain)
    return res.json({
        token
    })
})

app.get("/:token/:filename", hasPermission, async (req, res, next) => {
    let hash;
    let [_, extension] = req.params.filename.split(".");
    let {
        format, quality,
        blur, lightness, sharpen, flip,
        flop, inputText, colorText, leftText, topText,
        width, heigth, rotate, grayscale, saturation
    } = req.query;

    const fileHash = crypto.createHash('md5')
        .update(req.url.replace("/files/", ""))
        .digest("hex")

    const pathFilename = `./files/cached/${fileHash}.${extension}`
    const isExistFile = fs.existsSync(pathFilename);

    res.setHeader('Content-Type', 'image/png, image/jpeg, image/webp');

    if (isExistFile) {
        hash = getEtag(getLastModification(pathFilename))
        const ifNoneMatch = req.headers['if-none-match']
        if (hash == ifNoneMatch) {
            return res.sendStatus(304)
        }
    }

    const generateDynamicImage = new GenerateDynamicImage(`./files/${req.params.filename}`)

    if (blur) generateDynamicImage.applyBur(blur);
    if (lightness) generateDynamicImage.applyLightness(lightness)
    if (width && heigth) generateDynamicImage.applyWidthHeight(
        width, heigth
    )
    if (rotate) generateDynamicImage.applyRotate(rotate)
    if (grayscale) generateDynamicImage.applyGrayscale()
    if (sharpen) generateDynamicImage.applySharpen(sharpen)
    if (flip) generateDynamicImage.applyFlip()
    if (flop) generateDynamicImage.applyFlop()
    if (inputText && colorText && leftText && topText) generateDynamicImage.applyText(
        inputText, colorText, leftText, topText
    )
    if (saturation) generateDynamicImage.applySaturation(saturation)
    if (format && quality) generateDynamicImage.applyQuality(format, quality)

    const buffer = await generateDynamicImage.get();
    await generateDynamicImage.save(pathFilename)
    hash = getEtag(getLastModification(pathFilename))
    enableHTTPCache(res, hash)
    res.end(buffer)
})

app.listen(3000, () => console.log("Server is running"))
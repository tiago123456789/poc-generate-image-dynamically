require("dotenv").config()
const express = require("express")
const crypto = require('crypto')
const GenerateDynamicImage = require("./GenerateDynamicImage");
const { enableHTTPCache } = require("./CacheUtil");
const { generateToken } = require("./HashUtil");
const app = express();
const AWS = require("aws-sdk")
const multer = require('multer')
const multerS3 = require('multer-s3')
const { S3Client } = require('@aws-sdk/client-s3')

var credentials = new AWS.SharedIniFileCredentials({ profile: process.env.PROFILE });

const s3 = new S3Client({
    credentials
})

const s3Client = new AWS.S3({
    credentials
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))


const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.BUCKET,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, file.originalname)
        }
    })
})

const extractDomain = (req) => {
    return (req.headers.referer || req.headers.host)
        .replace(/(http|https)/, "")
        .replace(/:\/\//, "")
        .replace(/:([0-9])+$/, "")
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

app.post("/files", upload.single('file'), (req, res) => {
    return res.json(req.file)
})

app.get("/token/generate", (req, res) => {
    const domain = extractDomain(req)
    const token = generateToken(domain)
    return res.json({
        token
    })
})

const isExistFile = async (filename) => {
    try {
        const output = await s3Client.getObject({
            Bucket: process.env.BUCKET,
            Key: filename
        }).promise();

        return output.ETag
    } catch (error) {
        return false;
    }
}

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

    const pathFilename = `cached/${fileHash}.${extension}`
    const etagFile = await isExistFile(pathFilename);

    res.setHeader('Content-Type', 'image/png, image/jpeg, image/webp');

    if (etagFile) {
        const ifNoneMatch = req.headers['if-none-match']
        if (etagFile == ifNoneMatch) {
            return res.sendStatus(304)
        }
    }

    const output = await s3Client.getObject({
        Bucket: process.env.BUCKET,
        Key: req.params.filename
    }).promise()

    const generateDynamicImage = new GenerateDynamicImage(output.Body)
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
    const saveFileOutput = await s3Client.putObject({
        Bucket: process.env.BUCKET,
        Key: pathFilename,
        Body: buffer,
        
    }).promise()
    enableHTTPCache(res, saveFileOutput.ETag)
    res.end(buffer)
})

app.listen(3000, () => console.log("Server is running"))
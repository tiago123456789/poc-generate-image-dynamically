const { isValid } = require("ipaddr.js");
const sharp = require("sharp")

class GenerateDynamicImage {

    constructor(image) {
        this.image = image
        this.imageBuilder = sharp(this.image);
    }

    applyBur(blur) {
        this.imageBuilder.blur(parseInt(blur, 10))
        return this;
    }

    applyLightness(lightness) {
        this.imageBuilder.modulate({
            lightness: parseInt(lightness, 10)
        })
        return this;
    }

    applyWidthHeight(width, height) {
        this.imageBuilder.resize(parseInt(width), parseInt(height))
        return this;
    }

    applyRotate(rotate) {
        this.imageBuilder.rotate(parseInt(rotate))
        return this;

    }

    applyGrayscale() {
        this.imageBuilder.grayscale()
        return this;

    }

    applySharpen(sharpen) {
        this.imageBuilder.sharpen(parseInt(sharpen))
        return this;
    }

    applyFlip() {
        this.imageBuilder.flip();
        return this;
    }

    applyFlop() {
        this.imageBuilder.flop();
        return this;
    }

    applyText(inputText, colorText, leftText, topText) {
        const svgText = `
        <svg width="100%" height="100%">
          <style>
            .title { fill: ${colorText}; font-size:60px}
          </style>
          <text x="50%" y="80%" text-anchor="middle" class="title">${inputText}</text>
        </svg>`

        const svgBuffer = Buffer.from(svgText);

        this.imageBuilder
            .composite([
                {
                    input: svgBuffer,
                    left: parseInt(leftText),
                    top: parseInt(topText)
                }
            ])
        return this;
    }

    applySaturation(saturation) {
        imageBuilder.modulate({
            saturation: parseInt(saturation),
        })
    }

    applyQuality(format, quality) {
        const formatedAllowed = {
            "PNG": true,
            "JPEG": true,
            "WEBP": true
        }

        format = (format || "").toUpperCase()
        const isValidFormat = formatedAllowed[format] 
        if (!isValidFormat) {
            throw new Error("Format is invalid. Format allowed: png, jpeg and webp")
        }
        format = format.toLowerCase();
        this.imageBuilder[format]({ quality: parseInt(quality) })
        return this;
    }

    get() {
        return this.imageBuilder.toBuffer();
    }

    save(path) {
        return this.imageBuilder.toFile(path)
    }
}

module.exports = GenerateDynamicImage;
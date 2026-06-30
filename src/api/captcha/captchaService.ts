import svgCaptcha from "svg-captcha";
import { logger } from "@/server";

class CaptchaService {
  /**
   * Generates a new captcha.
   * @returns {{ id: string, svg: string }} - The captcha ID (which is the encrypted text) and the SVG image data.
   */
  generate() {
    const captcha = svgCaptcha.create({
      size: 6, // 6 characters
      ignoreChars: "0o1i", // characters to ignore
      noise: 2, // number of noise lines
      color: true, // characters will have different colors
      background: "#f4f4f4", // background color
    });

    // The 'id' will be the encrypted version of the captcha text.
    // We'll use a simple encryption for this example, but a more secure method should be used in production.
    const encryptedText = this.encrypt(captcha.text);

    return {
      id: encryptedText,
      svg: captcha.data,
    };
  }

  /**
   * Verifies the user's captcha input.
   * @param {string} encryptedText - The encrypted captcha text from the client.
   * @param {string} userInput - The user's input.
   * @returns {boolean} - True if the input is correct, false otherwise.
   */
  verify(encryptedText: string, userInput: string): boolean {
    try {
      const decryptedText = this.decrypt(encryptedText);
      return decryptedText.toLowerCase() === userInput.toLowerCase();
    } catch (error) {
      logger.error("Error decrypting captcha text", { error });
      return false;
    }
  }

  // Simple XOR encryption/decryption for demonstration.
  // IMPORTANT: Replace this with a more secure method like JWT or a session-based store in production.
  private key = "your-secret-key";

  private encrypt(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
    }
    return Buffer.from(result).toString("base64");
  }

  private decrypt(text: string): string {
    const fromBase64 = Buffer.from(text, "base64").toString("ascii");
    let result = "";
    for (let i = 0; i < fromBase64.length; i++) {
      result += String.fromCharCode(fromBase64.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length));
    }
    return result;
  }
}

export const captchaService = new CaptchaService();

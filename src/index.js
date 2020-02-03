const crypto = require("crypto");
const stream = require("stream");

const axios = require("axios");
const FormData = require("form-data");

// Typedefs
/**
 * File for upload
 * @typedef {object} FileUpload
 * @property {Buffer|ReadableStream} file - File data
 * @property {string} [fn] - File name
 */
/**
 * Options for uploading a file or files
 * @typedef {object} UploadOptions
 * @property {string} expire - Upload expiration date in epoch
 * @property {string} password - Password for accessing the upload
 * @property {string} description - Description of the upload
 */
/**
 * File metadata after creation
 * @typedef {object} FileCreated
 * @property {string} code - Upload ID
 * @property {string} removalCode - Removal code
 */
/**
 * Information about an upload
 * @typedef {object} UploadInfo
 * @property {string} code - Upload ID
 * @property {string} server - File upload server
 * @property {number} uploadTime - File upload time
 * @property {number} totalSize - Upload size
 * @property {number} views - Views
 * @property {number} hasZip - Has a zip file
 *
 * @property {object[]} files - List of files in upload
 * @property {string} files.name - File name
 * @property {number} files.size - File size
 * @property {string} files.md5 - MD5 hash of file
 * @property {string} files.mimetype - File mimetype
 * @property {string} files.link - File URL for download
 */

function sha256hash(str) {
  return crypto
    .createHash("sha256")
    .update(str)
    .digest("hex");
}

async function getServer(code) {
  try {
    const res = await axios({
      url: `https://apiv2.gofile.io/getServer${code ? `?c=${code}` : ""}`,
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      referrer: "https://gofile.io/?t=uploadFiles",
      referrerPolicy: "no-referrer-when-downgrade",
      body: null,
      method: "GET",
      mode: "cors"
    });

    if (res.data.status !== "ok") {
      throw new Error(
        `Fetching server info failed: ${JSON.stringify(res.data)}`
      );
    }
    return res.data.data.server;
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param {FileUpload[]} files - List of files to upload
 * @param {UploadOptions} options - Options for the upload
 * @returns {Promise<FileCreated>} ID and removal code of the uploaded files
 */
async function uploadFiles(files, options = {}) {
  try {
    const server = await getServer();
    const fd = new FormData();

    files.forEach(f => {
      if (f.fn === "") {
        fd.append("filesUploaded", f.file);
      } else {
        fd.append("filesUploaded", f.file, f.fn);
      }
    });

    fd.append("category", "file");

    if (options.description) {
      if (options.description.length <= 1000) {
        fd.append("description", options.description);
      } else {
        throw new Error("Invalid value for field description. ");
      }
    }
    if (options.password) {
      if (/^[a-z0-9]{6,20}$/i.test(options.password)) {
        fd.append("password", options.password);
      } else {
        throw new Error("Invalid value for field password. ");
      }
    }
    if (options.expire) {
      if (
        !isNaN(options.expire) && options.expire > 10000000000
          ? options.expire
          : options.expire / 1000 > Date.now() / 1000
      ) {
        fd.append(
          "expire",
          Math.round(
            options.expire > 10000000000
              ? options.expire
              : options.expire / 1000
          )
        );
      } else {
        throw new Error("Invalid value for field expire. ");
      }
    }

    const res = await axios({
      url: `https://${server}.gofile.io/upload`,
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        ...fd.getHeaders()
      },
      maxContentLength: Infinity,
      referrer: "https://gofile.io/?t=uploadFiles",
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors",
      data: fd
    });

    if (res.data.status !== "ok") {
      throw new Error(`Uploading file failed: ${JSON.stringify(res.data)}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

/**
 * @async
 * @function uploadFile
 * @description Note: a Buffer cannot be passed without a file name
 * @param {ReadableStream} file - ReadableStream with file data (file name is inferred)
 * @param {UploadOptions} options - Options for the upload
 * @returns {Promise<FileCreated>} ID and removal code of the uploaded file
 */
/**
 * @async
 * @function uploadFile
 * @param {Buffer|ReadableStream} file - Buffer or ReadableStream with file data
 * @param {string} fileName - File name
 * @param {UploadOptions} options - Options for the upload
 * @returns {Promise<FileCreated>} ID and removal code of the uploaded file
 */

async function uploadFile(arg1, arg2, arg3) {
  if (arg1 instanceof Buffer) {
    if (arg2 && arg2 !== "" && typeof arg2 !== "object") {
      return uploadFiles([{ file: arg1, fn: arg2 }], arg3);
    } else {
      throw Error("Filename must not be blank when using a Buffer.");
    }
  } else if (arg1 instanceof stream.Readable) {
    if (arg2 && arg2 !== "" && typeof arg2 !== "object") {
      return uploadFiles([{ file: arg1, fn: arg2 }], arg3);
    } else {
      return uploadFiles([{ file: arg1 }], arg2);
    }
  } else {
    throw Error("Invalid file type");
  }
}

/**
 *
 * @param {string} code - Upload ID
 * @param {string} removalCode - Removal code of the upload
 */
async function removeUpload(code, removalCode) {
  try {
    const server = await getServer(code);

    const res = await axios({
      url: `https://${server}.gofile.io/deleteUpload?c=${code}&rc=${removalCode}`,
      method: "GET",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      referrer: `https://gofile.io/?c=${code}`,
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors"
    });

    if (res.data.status !== "ok") {
      throw new Error(`Removing file failed: ${JSON.stringify(res.data)}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param {string} code - Upload ID
 * @param {string} [p] - Passphrase used to secure the upload
 * @returns {Promise<UploadInfo>}
 */
async function getUploadInfo(code, p = "") {
  try {
    const server = await getServer(code);

    const res = await axios({
      url: `https://${server}.gofile.io/getUpload?c=${code}${
        p && p !== "" ? `&p=${sha256hash(p)}` : ""
      }`,
      method: "GET",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      },
      referrer: `https://gofile.io/?c=${code}`,
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors"
    });

    if (res.data.status !== "ok") {
      throw new Error(`Fetching file info failed: ${JSON.stringify(res.data)}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

/**
 *
 * @param {string} code - Upload ID
 * @param {string} [p] - Passphrase used to secure the upload
 * @param {"arraybuffer"|"stream"} [responseType] - Return type
 * @returns {Promise<Buffer[]>|Promise<ReadableStream[]>} Returns an array of Buffers or Streams depending on the responseType parameter. Represents all files in the upload.
 */
async function downloadFiles(code, p = "", responseType = "arraybuffer") {
  try {
    const uploadInfo = await getUploadInfo(code, p);

    const reqs = Object.keys(uploadInfo.files)
      .map(k => uploadInfo.files[k])
      .map(f =>
        axios({
          url: f.link,
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "upgrade-insecure-requests": "1"
          },
          referrerPolicy: "no-referrer-when-downgrade",
          method: "GET",
          mode: "cors",
          responseType
        })
      );

    return (await Promise.all(reqs)).map(r => r.data);
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  uploadFile,
  uploadFiles,
  removeUpload,
  getUploadInfo,
  downloadFiles
};

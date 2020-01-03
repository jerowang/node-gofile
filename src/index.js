const crypto = require("crypto");

const axios = require("axios");
const FormData = require("form-data");

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
      throw new Error(`Fetching server info failed: ${res.data.status}`);
    }
    return res.data.data.server;
  } catch (e) {
    console.error(e);
  }
}

async function uploadFile(file, options = {}) {
  try {
    const server = await getServer();
    const fd = new FormData();
    fd.append("filesUploaded", file);
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
        !isNaN(options.expire) && options.expire.length > 10000000000
          ? options.expire
          : options.expire / 1000 > Date.now() / 1000
      ) {
        fd.append(
          "expire",
          Math.round(
            options.expire.length > 10000000000
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
      referrer: "https://gofile.io/?t=uploadFiles",
      referrerPolicy: "no-referrer-when-downgrade",
      mode: "cors",
      data: fd
    });

    if (res.data.status !== "ok") {
      throw new Error(`Uploading file failed: ${res.data.status}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

async function removeFile(code, removalCode) {
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
      throw new Error(`Removing file failed: ${res.data.status}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

async function getFileInfo(code, p) {
  try {
    const server = await getServer(code);

    const res = await axios({
      url: `https://${server}.gofile.io/getUpload?c=${code}${
        p ? `&p=${sha256hash(p)}` : ""
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
      throw new Error(`Fetching file info failed: ${res.data.status}`);
    }
    return res.data.data;
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  uploadFile,
  removeFile,
  getFileInfo
};

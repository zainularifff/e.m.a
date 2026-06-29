const fs = require("fs");
const path = require("path");

function stripInlineComment(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    let inQuote = false;
    let quoteChar = "";

    for (let i = 0; i < raw.length; i++) {
        const char = raw[i];

        if ((char === '"' || char === "'") && (i === 0 || raw[i - 1] !== "\\")) {
            if (!inQuote) {
                inQuote = true;
                quoteChar = char;
            } else if (quoteChar === char) {
                inQuote = false;
                quoteChar = "";
            }
        }

        if (!inQuote && (char === ";" || char === "#")) {
            return raw.slice(0, i).trim();
        }
    }

    return raw.replace(/^["']|["']$/g, "").trim();
}

function parseIni(content) {
    const result = {};
    let section = "";

    content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) return;

        const sectionMatch = trimmed.match(/^\[(.+)]$/);
        if (sectionMatch) {
            section = sectionMatch[1].trim();
            result[section] = result[section] || {};
            return;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) return;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = stripInlineComment(trimmed.slice(separatorIndex + 1));

        if (section) {
            result[section][key] = value;
        } else {
            result[key] = value;
        }
    });

    return result;
}

function findConfigPath() {
    const candidates = [
        process.env.MDM_CONFIG_PATH,
        path.resolve(process.cwd(), "backend", "config.ini"),
        path.resolve(process.cwd(), "config.ini"),
        path.resolve(__dirname, "..", "..", "config.ini")
    ].filter(Boolean);

    return candidates.find(candidate => fs.existsSync(candidate));
}

function getMdmConfig() {
    const configPath = findConfigPath();

    if (!configPath) {
        throw new Error("config.ini not found. Put it in backend/config.ini, project root config.ini, or set MDM_CONFIG_PATH.");
    }

    const parsed = parseIni(fs.readFileSync(configPath, "utf8"));
    const section = parsed.MDM_API || parsed.mdm_api || parsed;

    return {
        url: section.url || "",
        token: section.token || "",
        authScheme: section.authScheme !== undefined ? section.authScheme : "Basic",
        apiKey: section.apiKey || section.apikey || "",
        apiKeyHeader: section.apiKeyHeader || "ApiKey",
        groupName: section.groupName || "",
        groupId: section.groupId || section.GroupID || "",
        contentType: section.contentType || "application/json",
        timeout: section.timeout || "60000",
        remoteControlTimeout: section.remoteControlTimeout || section.timeout || "60000",
        remoteControlFallback: section.remoteControlFallback || "iframe",
        remoteSupportPerm: section.remoteSupportPerm || "126,127,128,129",
        remoteSupportBaseUrl: section.remoteSupportBaseUrl || "",
        portalUrl: section.portalUrl || "",
        baseUrl: section.baseUrl || ""
    };
}

module.exports = {
    getMdmConfig,
    parseIni
};

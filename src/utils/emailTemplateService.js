import EmailTemplate from "../models/EmailTemplate.js";
import { getDefaultTemplateByKey } from "../constants/emailTemplates.js";

const TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const renderEmailTemplate = (template, variables = {}) => {
    if (!template) return "";
    return template.replace(TOKEN_REGEX, (_, token) => {
        const value = variables[token];
        return value === undefined || value === null ? "" : String(value);
    });
};

export const getResolvedEmailTemplateByKey = async (key) => {
    const fallback = getDefaultTemplateByKey(key);
    if (!fallback) {
        return null;
    }

    try {
        const customTemplate = await EmailTemplate.findOne({ key }).lean();
        if (customTemplate && customTemplate.enabled) {
            return {
                key: customTemplate.key,
                name: customTemplate.name,
                subject: customTemplate.subject,
                html: customTemplate.html,
                source: "custom",
            };
        }
    } catch (error) {
        console.error(`Failed loading custom email template "${key}", using default.`, error.message);
    }

    return {
        ...fallback,
        source: "default",
    };
};

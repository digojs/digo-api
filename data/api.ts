/**
 * @file API：__description
 * @author __author
 */
import { ajax } from "__ajax";

/**
 * __description
 * @param __paramsDescription
 * @param success The request success callback.
 * @param error The request error callback.
 * @deprecated __deprecated
 * @since __since
 */
export default function __name(__params, success?: (data: __returnDataType, response: __returnType, xhr: XMLHttpRequest) => void, error?: (message: __returnMessageType, response: __returnType, xhr: XMLHttpRequest) => void) {
    ajax({
        url: __url,
        method: __method,
        contentType: __contentType,
        data: __data,
        success: success,
        error: error
    });
}

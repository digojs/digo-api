/**
 * @file API：<%= $data.categoryDescription ? $data.categoryDescription + "(" + $data.category + ")" : $data.categoryDescription %>
 */
import { ajax } from "<%= $data.ajax %>";

<% for (var key in $data.apis) { %>
<%      var api = $data.apis[key]; %>
/**
<% if (api.description) { %>
 * <%= api.description %>
<% } %>
<% for (var key in api.params) { %>
<%      var param = api.params[key] %>
 * @param <%= key %> <%= param.description %>
<% } %>
 * @param success The request success callback.
 * @param error The request error callback.
<% if (api.deprecated) { %>
 * @deprecated <%= api.deprecated === true ? "" : api.deprecated %>
<% } %>
<% if (api.since) { %>
 * @since <%= api.since %>
<% } %>
<% if (api.author) { %>
 * @author <%= api.author %>
<% } %>
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
<% } %>




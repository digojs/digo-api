/**
 * @file API：<%= $.category.description ? $.category.description + "(" + $.category.name + ")" : $.category.name %>
<% if ($.data.author) { %>
 * @author <%= $.data.author %>
<% } %>
<% if ($.data.license) { %>
 * @license <%= $.data.license %>
<% } %>
<% if ($.data.copyright) { %>
 * @copyright <%= $.data.copyright %>
<% } %>
 */
import { ajax } from "<%= $.data.ajaxModule %>";
<% for (var key in $.category.exportApis) { %>
<%      var api = $.category.exportApis[key]; %>

/**
<% if (api.description) { %>
 * <%= api.description %>
<% } %>
<% for (var key in api.params) { %>
<%      var param = api.params[key] %>
 * @param <%= param.exportName %><%= param.description ? " " + param.description : "" %>
<% } %>
 * @param success <%= $.data.successDescription || "The request callback when succeed." %>
 * @param error <%= $.data.successDescription || "The request callback when error occurs." %>
<% if (api.deprecated) { %>
 * @deprecated<%= api.deprecated === true ? "" : " " + api.deprecated %>
<% } %>
<% if (api.created) { %>
 * @since <%= api.created %>
<% } %>
<% if (api.author) { %>
 * @author <%= api.author %>
<% } %>
 */
export function <%= api.exportName %>(<% for(var key in api.params) { var param = api.params[key]; %><%= param.exportName %><%= param.optional ? "?" : "" %>: <%= param.exportType %>, <% } %>success?: (data: <%= api.return.exportDataType %>, response: <%= api.return.exportType %>, xhr: XMLHttpRequest) => void, error?: (message: <%= api.return.exportMessageType %>, response: <%= api.return.exportType %>, xhr: XMLHttpRequest) => void) {
    ajax({
<% if (api.url) { %>
        url: <%= JSON.stringify(api.url) %>,
<% } %>
<% if (api.method) { %>
        method: <%= JSON.stringify(api.method) %>,
<% } %>
<% if (api.contentType) { %>
        contentType: <%= JSON.stringify(api.contentType) %>,
<% } %>
<% if (api.cache) { %>
        cache: <%= JSON.stringify(api.cache) %>,
<% } %>
<% if (Object.keys(api.params).length) { %>
        data: {
<% for (var key in api.params) { %>
<%      var param = api.params[key] %>
            <%= $.isPropName(param.name) ? param.name : JSON.stringify(param.name) %>: <%= param.exportName %>,
<% } %>
        },
<% } %>
        success: success,
        error: error
    });
}
<% } %>
<% for (var key in $.category.exportTypes) { %>
<%      var type = $.category.exportTypes[key]; %>
<%      if (type.native || type.underlyingGeneric || type.underlyingArray || type.underlyingObject) continue; %>

<% if (type.description || type.deprecated || type.created) { %>
/**
<% if (type.description) { %>
 * <%= type.description %>
<% } %>
<% if (type.deprecated) { %>
 * @deprecated<%= type.deprecated === true ? "" : " " + type.deprecated %>
<% } %>
<% if (type.created) { %>
 * @since <%= type.created %>
<% } %>
 */
<% } %>
export <%= type.type === "enum" ? "enum" : "interface" %> <%= type.exportName %><%= type.genericParameters ? "<" + type.genericParameters.join(", ") + ">" : "" %><%= type.exportExtends ? " extends " + type.exportExtends : "" %> {

<%      for (var key2 in type.fields) { %>
<%          var field = type.fields[key2]; %>
<%          if (field.description || field.deprecated || field.created) { %>
    /**
<%              if (field.description) { %>
     * <%= field.description %>
<%              } %>
<%              if (field.deprecated) { %>
     * @deprecated<%= field.deprecated === true ? "" : " " + field.deprecated %>
<%              } %>
<%              if (field.created) { %>
     * @since <%= field.created %>
<%              } %>
     */
<%          } %>
<%          if (type.type === "enum") { %>
    <%=         field.exportName %><%= field.default !== undefined ? " = " + field.default : "" %>,
<%          } else { %>
    <%=         field.exportName %>: <%= field.exportType %>;
<%          } %>

<%      } %>
}
<% } %>

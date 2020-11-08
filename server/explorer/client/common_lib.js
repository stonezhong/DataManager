// import { EventEmitter } from 'events';
import $ from 'jquery'
const _ = require("lodash");

/*************************************************************************
 * Common elements for each page
 *
 * <meta name="user" content="JSON_OBJECT">
 *      This the user information for the current user
 *      If user is not logged in, then this element does not exist
 *
 * <meta name="csrf" content="...">
 *      This is the csrf token for the current page
 *
 * <meta name="app_config" content="JSON_OBJECT">
 *      This is the global application config. It is the same cross the board
 *
 * <meta name="app_context" content="JSON_OBJECT">
 *      This is the application specific context, different from app to app.
 *************************************************************************/

export function dt_2_utc_string(dt) {
    const year   = dt.getUTCFullYear();
    const month  = ('0' + (dt.getUTCMonth()+1)).slice(-2)
    const day    = ('0' + dt.getUTCDate()).slice(-2)
    const hour   = ('0' + dt.getUTCHours()).slice(-2);
    const minute = ('0' + dt.getUTCMinutes()).slice(-2);
    const second = ('0' + dt.getUTCSeconds()).slice(-2);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function get_csrf_token() {
    return $("meta[name='csrf']")[0].content;
}

export function get_current_user() {
    const elements = $("meta[name='user']");
    if (elements.length > 0)
        return JSON.parse(elements[0].content);
    else
        return null
}

export function get_app_config() {
    const elements = $("meta[name='app_config']");
    if (elements)
        return JSON.parse(elements[0].content);
    else
        return {}
}

export function get_app_context() {
    const elements = $("meta[name='app_context']");
    if (elements)
        return JSON.parse(elements[0].content);
    else
        return {}
}

export function pipeline_to_django_model(pipeline) {
    const context = {
        type        : pipeline.type,
        dag_id      : pipeline.dag_id,
        requiredDSIs: pipeline.requiredDSIs,
        tasks       : pipeline.tasks,
        dependencies: pipeline.dependencies,
    };

    const to_post = {
        name            : pipeline.name,
        description     : pipeline.description,
        team            : pipeline.team,
        category        : pipeline.category,
        context         : JSON.stringify(context),
    }

    if ('paused' in pipeline) {
        to_post.paused = pipeline.paused;
    }
    if ('retired' in pipeline) {
        to_post.retired = pipeline.retired;
    }

    return to_post;
}

export function pipeline_from_django_model(pipeline) {
    const context = JSON.parse(pipeline.context);
    const p = {
        id: pipeline.id,
        name: pipeline.name,
        team: pipeline.team,
        category: pipeline.category,
        description: pipeline.description,
        type: context.type,
        tasks: context.tasks,
        dependencies: context.dependencies,
        requiredDSIs: context.requiredDSIs,
        dag_id: context.dag_id,
        author: pipeline.author,
        paused: pipeline.paused,
        retired: pipeline.retired,
        version: pipeline.version,
        dag_version: pipeline.dag_version,
    }
    return p;
}

export function null_2_empty_str(v) {
    // if v is null, return empty string
    return v?v:"";
}

export function empty_str_2_null(v) {
    const vv = _.trim(v);
    return vv?vv:null;
}
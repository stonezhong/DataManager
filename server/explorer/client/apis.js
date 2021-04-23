const buildUrl = require('build-url');

import {
    handle_json_response,
    dt_2_utc_string,
    pipeline_to_django_model
} from '/common_lib';

/************************************************
 * Functions
 *     saveTenant
 *     getUserTenantSubscriptions
 *     saveDataset
 *     getDatasets
 *     getAssets
 *     deleteAsset
 *     getDataRepos
 *     saveDataRepo
 *     getApplications
 *     saveApplication
 *     getTimers
 *     saveTimer
 *     getPipelines
 *     savePipeline
 *     getPipelineGroups
 *     savePipelineGroup
 *     getPipelineGroup
 *
 */



export function pausePipeline(csrf_token, pipeline_id) {
    // called when user want to pause a pipeline
    return fetch(`/api/Pipelines/${pipeline_id}/`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token,
            'X-Data-Manager-Use-Method': 'PATCH',
        },
        body: JSON.stringify({paused: true})
    }).then(handle_json_response)
}

export function unpausePipeline(csrf_token, pipeline_id) {
    // called when user want to unpause a pipeline
    return fetch(`/api/Pipelines/${pipeline_id}/`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token,
            'X-Data-Manager-Use-Method': 'PATCH',
        },
        body: JSON.stringify({paused: false})
    }).then(handle_json_response)
}

export function retirePipeline(csrf_token, pipeline_id) {
    // called when user want to retire a pipeline
    return fetch(`/api/Pipelines/${pipeline_id}/`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token,
            'X-Data-Manager-Use-Method': 'PATCH',
        },
        body: JSON.stringify({retired: true})
    }).then(handle_json_response)
}


// === verified ===
export function saveTenant(csrf_token, mode, tenant) {
    // csrf_token: as name indicates
    // if mode is "new", we want to create a new application
    // if mode is "edit", we want patch an existing application
    if (mode === "new") {
        // for new application, you do not need to pass "retired" -- it is false
        const to_post = {
            name            : tenant.name,
            description     : tenant.description,
            config          : tenant.config,
            is_public       : tenant.is_public,
        }

        return fetch('/api/Tenants/', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response)
    } else if (mode === "edit") {
        const to_patch = {
            name            : tenant.name,
            description     : tenant.description,
            config          : tenant.config,
            is_public       : tenant.is_public,
        }
        return fetch(`/api/Tenants/${tenant.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response)
    }
}

export function getUserTenantSubscriptions(offset, limit) {
    const buildArgs = {
        path: `/api/UserTenantSubscriptions/`,
        queryParams: {
            offset: offset,
            limit : limit,
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);

}

export function getDatasets(tenant_id, offset, limit, {showExpired:showExpired}) {
    const buildArgs = {
        path: `/api/${tenant_id}/Datasets/`,
        queryParams: {
            offset: offset,
            limit : limit,
            ordering: "-publish_time",
        }
    };
    if (!showExpired) {
        buildArgs.queryParams.expiration_time__isnull="True"
    }
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);

}

export function saveDataset(csrf_token, tenant_id, mode, dataset) {
    // csrf_token: as name indicates
    // if mode is "new", we want to create a new dataset
    // if mode is "edit", we want patch an existing dataset
    if (mode == "new") {
        // TODO: shuold not trust client side time
        const to_post = {
            name            : dataset.name,
            major_version   : dataset.major_version,
            minor_version   : parseInt(dataset.minor_version),
            description     : dataset.description,
            team            : dataset.team,
        }

        return fetch(`/api/${tenant_id}/Datasets/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response)
    } else if (mode == 'edit') {
        // You can only change description and team
        const to_patch = {
            description     : dataset.description,
            team            : dataset.team,
            expiration_time : (dataset.expiration_time==='')?null:dataset.expiration_time,
            schema_ext      : dataset.schema_ext,
        }

        return fetch(`/api/${tenant_id}/Datasets/${dataset.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response);
    }
}

export function getAssets(tenant_id, dataset_id, offset, limit, active) {
    // if active is false, we return all assets
    // if active is true, we return non-deleted assets
    const buildArgs = {
        path: `/api/${tenant_id}/Assets/`,
        queryParams: {
            offset: offset,
            limit : limit,
            dataset_id: dataset_id
        }
    };
    if (active) {
        buildArgs.queryParams.deleted_time__isnull = 'True';
    }
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function deleteAsset(csrf_token, tenant_id, asset_id) {
    return fetch(
        `/api/${tenant_id}/Assets/${asset_id}/`,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            }
        }
    ).then(handle_json_response);
}

export function getDataRepos(tenant_id, offset, limit) {
    const buildArgs = {
        path: `/api/${tenant_id}/DataRepos/`,
        queryParams: {
            offset: offset,
            limit : limit,
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function saveDataRepo(csrf_token, tenant_id, mode, datarepo) {
    // csrf_token: as name indicates
    // if mode is "new", we want to create a new data repo
    // if mode is "edit", we want patch an existing data repo
    if (mode === "new") {
        // for new application, you do not need to pass "retired" -- it is false
        const to_post = {
            name            : datarepo.name,
            description     : datarepo.description,
            type            : datarepo.type,
            context         : datarepo.context,
        }

        return fetch(`/api/${tenant_id}/DataRepos/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response)
    } else if (mode === "edit") {
        // change repo name is not allowed
        const to_patch = {
            description     : datarepo.description,
            type            : datarepo.type,
            context         : datarepo.context,
        }
        return fetch(`/api/${tenant_id}/DataRepos/${datarepo.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response)
    }
}

export function getApplications(tenant_id, offset, limit) {
    const buildArgs = {
        path: `/api/${tenant_id}/Applications/`,
        queryParams: {
            offset: offset,
            limit : limit,
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function saveApplication(csrf_token, tenant_id, mode, application) {
    // csrf_token: as name indicates
    // if mode is "new", we want to create a new application
    // if mode is "edit", we want patch an existing application
    if (mode === "new") {
        // for new application, you do not need to pass "retired" -- it is false
        const to_post = {
            name            : application.name,
            description     : application.description,
            team            : application.team,
            app_location    : application.app_location,
        }

        return fetch(`/api/${tenant_id}/Applications/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response)
    } else if (mode === "edit") {
        const to_patch = {
            description     : application.description,
            team            : application.team,
            app_location    : application.app_location,
            retired         : application.retired,
        }
        return fetch(`/api/${tenant_id}/Applications/${application.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response)
    }
}

export function getTimers(tenant_id, offset, limit) {
    const buildArgs = {
        path: `/api/${tenant_id}/Timers/`,
        queryParams: {
            offset: offset,
            limit : limit,
            topic: 'pipeline'
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function saveTimer(csrf_token, tenant_id, mode, timer) {
    if (mode === "new") {
        const to_post = {
            name            : timer.name,
            description     : timer.description,
            team            : timer.team,
            paused          : timer.paused,
            interval_unit   : timer.interval_unit,
            interval_amount : timer.interval_amount,
            start_from      : timer.start_from,
            topic           : timer.topic,
            context         : timer.context,
            category        : timer.category,
            end_at          : timer.end_at,
        }

        return fetch(`/api/${tenant_id}/Timers/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response)
    } else if (mode === "edit") {
        const to_patch = {
            description     : timer.description,
            team            : timer.team,
            paused          : timer.paused,
            interval_unit   : timer.interval_unit,
            interval_amount : timer.interval_amount,
            start_from      : timer.start_from,
            end_at          : timer.end_at,
            topic           : timer.topic,
            context         : timer.context,
            category        : timer.category,
        }

        return fetch(`/api/${tenant_id}/Timers/${timer.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response);
    }
}

export function getPipelines(tenant_id, offset, limit) {
    const buildArgs = {
        path: `/api/${tenant_id}/Pipelines/`,
        queryParams: {
            offset: offset,
            limit : limit,
            retired: "False"
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function savePipeline(csrf_token, tenant_id, mode, pipeline) {
    const to_post = pipeline_to_django_model(pipeline);
    if (mode == "new") {
        return fetch(`/api/${tenant_id}/Pipelines/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        })
            .then(handle_json_response)
            .then(
                pipeline_created => {
                    if (pipeline.type == 'external') {
                        return ;
                    } else {
                        // this is sequential
                        // we will create DAG
                        return fetch(`/api/${tenant_id}/Pipelines/${pipeline_created.id}/create_dag/`, {
                            method: 'post',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': csrf_token,
                            },
                        }).then(handle_json_response);
                    }
                }
            )
    } else {
        // we are editing an existing pipeline
        return fetch(`/api/${tenant_id}/Pipelines/${pipeline.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response);
    }
}

export function getPipelineGroups(tenant_id, offset, limit) {
    const buildArgs = {
        path: `/api/${tenant_id}/PipelineGroups/`,
        queryParams: {
            offset: offset,
            limit : limit,
            retired: "False",
            ordering: "-created_time"
        }
    };
    const url = buildUrl('', buildArgs);
    return fetch(url).then(handle_json_response);
}

export function savePipelineGroup(csrf_token, tenant_id, mode, pipeline_group) {
    if (mode === "new") {
        const now = dt_2_utc_string(new Date());
        const to_post = {
            name        : pipeline_group.name,
            category    : pipeline_group.category,
            context     : pipeline_group.context,
            due         : pipeline_group.due,
        };
        return fetch(`/api/${tenant_id}/PipelineGroups/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
            },
            body: JSON.stringify(to_post)
        }).then(handle_json_response);
    } else if (mode === "edit") {
        const to_patch = {
            context     : pipeline_group.context,
            finished    : pipeline_group.finished,
        }
        return fetch(`/api/${tenant_id}/PipelineGroups/${pipeline_group.id}/`, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf_token,
                'X-Data-Manager-Use-Method': 'PATCH',
            },
            body: JSON.stringify(to_patch)
        }).then(handle_json_response);
    }
}

export function getPipelineGroup(tenant_id, pipeline_group_id) {
    return fetch(
        `/api/${tenant_id}/PipelineGroups/${pipeline_group_id}/`
    ).then(handle_json_response);
}

import {handle_json_response, dt_2_utc_string} from '/common_lib'

export function saveDataset(csrf_token, mode, dataset) {
    // csrf_token: as name indicates
    // if mode is "new", we want to create a new dataset
    // if mode is "edit", we want patch an existing dataset
    if (mode == "new") {
        // TODO: shuold not trust client side time
        const now = dt_2_utc_string(new Date());
        const to_post = {
            name            : dataset.name,
            major_version   : dataset.major_version,
            minor_version   : dataset.minor_version,
            description     : dataset.description,
            team            : dataset.team,
            publish_time    : now,
        }

        return fetch('/api/Datasets/', {
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
            expiration_time : (dataset.expiration_time==='')?null:dataset.expiration_time
        }

        return fetch(`/api/Datasets/${dataset.id}/`, {
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

export function saveApplication(csrf_token, mode, application) {
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

        return fetch('/api/Applications/', {
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
        return fetch(`/api/Applications/${application.id}/`, {
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

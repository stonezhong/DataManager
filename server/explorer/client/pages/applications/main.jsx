import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {ApplicationTable} from '/components/business/application/application_table.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, handle_json_response} from '/common_lib'

class ApplicationsPage extends React.Component {
    theTopMessageRef = React.createRef();

    onSave = (mode, application) => {
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
                    'X-CSRFToken': get_csrf_token(),
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
                    'X-CSRFToken': get_csrf_token(),
                    'X-Data-Manager-Use-Method': 'PATCH',
                },
                body: JSON.stringify(to_patch)
            }).then(handle_json_response)
        }
    };


    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Applications/",
            queryParams: {
                offset: offset,
                limit : limit,
            }
        };
        if (!this.props.current_user.is_superuser) {
            // non-admin should not see system apps
            buildArgs.queryParams.sys_app_id__isnull = "True";
        }
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);
    };


    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <ApplicationTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    onSave={this.onSave}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <ApplicationsPage current_user={current_user} />,
        document.getElementById('app')
    );
});

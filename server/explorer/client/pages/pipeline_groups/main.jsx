import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {PipelineGroupTable} from '/components/business/pipeline_group/pipeline_group_table.jsx'

import $ from 'jquery'
const buildUrl = require('build-url');

import {dt_2_utc_string, get_csrf_token, get_current_user, get_tenant_id, handle_json_response} from '/common_lib'

class PipelineGroupsPage extends React.Component {
    state = {
        pipeline_groups: [],
    };

    onSave = (mode, pipeline_group) => {
        if (mode === "new") {
            const now = dt_2_utc_string(new Date());
            const to_post = {
                tenant_id   : this.props.tenant_id,
                name        : pipeline_group.name,
                created_time: now,
                category    : pipeline_group.category,
                context     : pipeline_group.context,
                finished    : pipeline_group.finished,
                manual      : true,
            };
            return fetch('/api/PipelineGroups/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            }).then(handle_json_response);
        } else if (mode === "edit") {
            const to_patch = {
                context     : pipeline_group.context,
                finished    : pipeline_group.finished,
            }
            return fetch(`/api/PipelineGroups/${pipeline_group.id}/`, {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                    'X-Data-Manager-Use-Method': 'PATCH',
                },
                body: JSON.stringify(to_patch)
            }).then(handle_json_response);
        }
    };

    thePipelineGroupEditorRef = React.createRef();

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/PipelineGroups/",
            queryParams: {
                offset: offset,
                limit : limit,
                tenant_id: this.props.tenant_id,
                ordering: "-created_time"
            }
        };
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);

    };

    render() {
        return (
            <Container fluid>
                <PipelineGroupTable
                    tenant_id={this.props.tenant_id}
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
    const current_user = get_current_user();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <PipelineGroupsPage
            current_user={current_user}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});

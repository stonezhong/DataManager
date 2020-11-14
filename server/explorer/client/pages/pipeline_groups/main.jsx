import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {PipelineGroupTable} from '/components/business/pipeline_group/pipeline_group_table.jsx'

import $ from 'jquery'

import {dt_2_utc_string, get_csrf_token, get_current_user} from '/common_lib'

class PipelineGroupsPage extends React.Component {
    state = {
        pipeline_groups: [],
    };

    onSave = (mode, pipeline_group) => {
        if (mode === "new") {
            const now = dt_2_utc_string(new Date());
            const to_post = {
                name        : pipeline_group.name,
                created_time: now,
                category    : pipeline_group.category,
                context     : pipeline_group.context,
                finished    : pipeline_group.finished,
                manual      : true,
            };
            fetch('/api/PipelineGroups/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        this.load_pipeline_groups();
                    }
                );
        } else if (mode === "edit") {
            const to_patch = {
                context     : pipeline_group.context,
                finished    : pipeline_group.finished,
            }
            fetch(`/api/PipelineGroups/${pipeline_group.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        this.load_pipeline_groups();
                    }
                );
        }
    };

    thePipelineGroupEditorRef = React.createRef();

    load_pipeline_groups() {
        fetch("/api/PipelineGroups/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState({pipeline_groups: result})
            }
        )
    }


    componentDidMount() {
        this.load_pipeline_groups();
    }

    render() {
        return (
            <Container fluid>
                <PipelineGroupTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    pipeline_groups={this.state.pipeline_groups}
                    onSave={this.onSave}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <PipelineGroupsPage current_user={current_user} />,
        document.getElementById('app')
    );
});

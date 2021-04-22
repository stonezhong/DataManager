import React from 'react'
import ReactDOM from 'react-dom'
import Container from 'react-bootstrap/Container'
import $ from 'jquery'

import {PipelineGroupTable} from '/components/business/pipeline_group/pipeline_group_table.jsx'
import {getPipelineGroups} from '/apis'
import {get_csrf_token, get_current_user, get_tenant_id} from '/common_lib'

class PipelineGroupsPage extends React.Component {
    state = {
        pipeline_groups: [],
    };

    thePipelineGroupEditorRef = React.createRef();

    get_page = (offset, limit, filter={}) => getPipelineGroups(
        this.props.tenant_id, offset, limit
    );

    render() {
        return (
            <Container fluid>
                <PipelineGroupTable
                    tenant_id={this.props.tenant_id}
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
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

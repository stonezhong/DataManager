import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import * as Icon from 'react-bootstrap-icons'

import {PipelineGroupViewer} from '/components/business/pipeline_group/pipeline_group_viewer.jsx'
import {DataTable} from '/components/generic/datatable/main.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'

import './pipeline_group.scss'

/*********************************************************************************
 * Purpose: Show list of pipeline groups (aka Executions)
 * TODO: pagination
 *
 * Props
 *     get_page         : A function to get the page
 *
 */
export class PipelineGroupTable extends React.Component {
    thePipelineGroupViewerRef   = React.createRef();
    theDataTableRef             = React.createRef();

    render_tools = pipeline_group =>
        <Button
            variant="secondary"
            size="sm"
            onClick = {event => {
                this.thePipelineGroupViewerRef.current.openDialog(
                    {pipeline_group:pipeline_group}
                )
            }}
        >
            <Icon.Info />
        </Button>;

    render_name = pipeline_group => <a href={`/explorer/${this.props.tenant_id}/execution?id=${pipeline_group.id}`}>{pipeline_group.name}</a>;

    get_page = (offset, limit) => {
        return this.props.get_page(
            offset,
            limit,
        );
    };

    columns = {
        tools:              {display: "", render_data: this.render_tools},
        name:               {display: "Name", render_data: this.render_name},
        created_time:       {display: "Created Time"},
        category:           {display: "Category"},
        finished:           {
            display: "Finished",
            render_data: pipeline_group => <AppIcon type={pipeline_group.finished?"checkmark":"dismiss"} className="icon24"/>
        },
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Executions</h1>
                    </Col>
                </Row>

                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="pipeline-group-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />
                <PipelineGroupViewer
                    ref={this.thePipelineGroupViewerRef}
                    onSave={null}
                />
            </div>
        )
    }
}


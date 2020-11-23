import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import {PipelineGroupEditor} from '/components/business/pipeline_group/pipeline_group_editor.jsx'
import {DataTable} from '/components/generic/datatable/main.jsx'

import './pipeline_group.scss'

/*********************************************************************************
 * Purpose: Show list of pipeline groups (aka Executions)
 * TODO: pagination
 *
 * Props
 *     get_page         : A function to get the page
 *     allowEdit        : if True, user is allowed to edit pipeline group.
 *     allowNew         : if True, user is allowed to create new pipeline group
 *     onSave           : a callback, called with user want to save or edit
 *                        a pipeline group. onSave(mode, pipeline_group) is called,
 *                        mode is either "new" or "edit"
 *
 */
export class PipelineGroupTable extends React.Component {
    thePipelineGroupEditorRef   = React.createRef();
    theDataTableRef             = React.createRef();

    canEdit = pipeline_group => {
        return this.props.allowEdit && pipeline_group.manual && !pipeline_group.finished;
    };

    render_tools = pipeline_group =>
        <Button
            variant="secondary"
            size="sm"
            onClick = {event => {
                this.thePipelineGroupEditorRef.current.openDialog(
                    this.canEdit(pipeline_group)?"edit":"view", pipeline_group
                )
            }}
        >
            { this.canEdit(pipeline_group)?<Icon.Pencil />:<Icon.Info /> }
        </Button>;

    render_name = pipeline_group => <a href={`execution?id=${pipeline_group.id}`}>{pipeline_group.name}</a>;

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
        manual:             {
            display: "Manual",
            render_data: pipeline_group => pipeline_group.manual?"manual":"auto"
        },
        finished:           {
            display: "Finished",
            render_data: pipeline_group => <img src={pipeline_group.finished?"/static/images/checkmark-32.ico":"/static/images/x-mark-32.ico"} className="icon24"/>
        },
    };

    onSave = (mode, pipeline_group) => {
        return this.props.onSave(
            mode, pipeline_group
        ).then(this.theDataTableRef.current.refresh);
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Executions</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.thePipelineGroupEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        }
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

                <PipelineGroupEditor
                    ref={this.thePipelineGroupEditorRef}
                    onSave={this.onSave}
                />
            </div>
        )
    }
}


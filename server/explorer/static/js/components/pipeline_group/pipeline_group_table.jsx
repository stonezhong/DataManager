import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import {PipelineGroupEditor} from '/components/pipeline_group/pipeline_group_editor.jsx'

/*********************************************************************************
 * Purpose: Show list of pipeline groups (aka Executions)
 * TODO: pagination
 *
 * Props
 *     pipeline_groups  : a list of applications
 *     allowEdit        : if True, user is allowed to edit pipeline group.
 *     allowNew         : if True, user is allowed to create new pipeline group
 *     onSave           : a callback, called with user want to save or edit
 *                        a pipeline group. onSave(mode, pipeline_group) is called,
 *                        mode is either "new" or "edit"
 *
 */
export class PipelineGroupTable extends React.Component {
    thePipelineGroupEditorRef = React.createRef();

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

                <Table hover>
                    <thead className="thead-dark">
                        <tr>
                            <th className="c-tc-icon1"></th>
                            <th>Name</th>
                            <th>Created Time</th>
                            <th>Category</th>
                            <th>Finished</th>
                        </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.pipeline_groups.map((pipeline_group) => {
                            return (
                                <tr key={pipeline_group.id}>
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={event => {
                                                this.thePipelineGroupEditorRef.current.openDialog(
                                                    this.props.allowEdit?"edit":"view", pipeline_group
                                                )
                                            }}
                                        >
                                            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
                                        </Button>
                                    </td>
                                    <td><a href={`execution?id=${pipeline_group.id}`}>{pipeline_group.name}</a></td>
                                    <td>{pipeline_group.created_time}</td>
                                    <td>{pipeline_group.category}</td>
                                    <td>{pipeline_group.finished?"Yes":"No"}</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <PipelineGroupEditor
                    ref={this.thePipelineGroupEditorRef}
                    onSave={this.props.onSave}
                />
            </div>
        )
    }
}


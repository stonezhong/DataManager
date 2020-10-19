import React from 'react'
import ReactDOM from 'react-dom'

import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'

import {PipelineGroupEditor} from '/components/pipeline_group_editor/pipeline_group_editor.jsx'

import $ from 'jquery'

import {dt_2_utc_string, get_csrf_token, get_current_user} from '/common_lib'

class PipelineGroups extends React.Component {
    state = {
        pipeline_groups: [],
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

    onSave = (mode, pipeline_group) => {
        // mode MUST be "new"
        const now = dt_2_utc_string(new Date());
        const to_post = {
            name        : pipeline_group.name,
            created_time: now,
            category    : pipeline_group.category,
            context     : pipeline_group.context,
            finished    : pipeline_group.finished,
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
            )

    };

    componentDidMount() {
        this.load_pipeline_groups();
    }

    render() {
        return (
            <div>
                <Container fluid>
                    <Row>
                        <Col>
                            <h1 className="c-ib">Executions</h1>
                            <Button
                                disabled = {!this.props.current_user}
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.thePipelineGroupEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Table hover>
                                <thead className="thead-dark">
                                    <tr>
                                        <th>Name</th>
                                        <th>Created Time</th>
                                        <th>Category</th>
                                        <th>Finished</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {
                                    this.state.pipeline_groups.map((pipeline_group) => {
                                        return (
                                            <tr key={pipeline_group.id}>
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
                        </Col>
                    </Row>
                </Container>
                <PipelineGroupEditor
                    ref={this.thePipelineGroupEditorRef}
                    onSave={this.onSave}
                />
            </div>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <PipelineGroups current_user={current_user} />,
        document.getElementById('app')
    );
});

import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import classNames from 'classnames'
import * as Icon from 'react-bootstrap-icons'
import {SequentialTaskEditor} from './task_editor.jsx'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Pipeline
 *
 * Props
 *     applications: a list of all possible applications
 *                   each application must has field 'id' and 'name'
 *     onSave   : called when user hit "Save Changes", onSave(mode, pipeline) is called
 *                mode could be "new" or "edit"
 *     onCancel : called when user hit "Close" or close the dialog without save the change
 *
 */
export class PipelineEditor extends React.Component {
    theTaskEditorRef = React.createRef();

    initPipelineValue = () => {
        return {
            name: '',
            team: '',
            category: '',
            description: '',
            type: 'sequential',
            tasks: [],
            requiredDSIs: [],          // required dataset instances
            dag_id: '',                // for external pipeline
        };
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        pipeline: this.initPipelineValue(),
    };

    onClose = () => {
        if (this.props.onCancel) {
            this.setState({show: false}, this.props.onCancel);
        } else {
            this.setState({show: false});
        }
    };

    addRequiredDSI = dsi => {
        this.setState(state => {
            state.pipeline.requiredDSIs.push(dsi);
            return state;
        });
    };

    onSave = () => {
        const savedPipeline = _.cloneDeep(this.state.pipeline);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, savedPipeline)});
    };

    getApplicationName = task => {
        if (task.type != "other") {
            return ""
        }
        const apps = this.props.applications.filter(p => p.id==task.application_id);
        if (apps.length > 0) {
            return apps[0].name;
        }
        return "";
    };

    openDialog = (pipeline) => {
        if (pipeline) {
            this.setState({
                show: true,
                mode: "edit",
                pipeline: pipeline
            });
        } else {
            this.setState({
                show: true,
                mode: "new",
                pipeline: this.initPipelineValue()
            });
        }
    };

    addTask = () => {
        this.theTaskEditorRef.current.openDialog();
    };

    deleteTask = (task) => {
        this.setState(state => {
            const new_tasks = state.pipeline.tasks.filter(t => t.name != task.name);
            state.pipeline.tasks = new_tasks;
            return state;
        });
    };

    onTaskSaved = task => {
        this.setState(state => {
            const idx = state.pipeline.tasks.findIndex(taskX => taskX.name == task.name);
            if (idx >= 0) {
                state.pipeline.tasks[idx] = task;
            } else {
                state.pipeline.tasks.push(task);
            }
            return state;
        });
    };

    editTask = task => {
        this.theTaskEditorRef.current.openDialog(task);
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='xl'
                scrollable
            >

                <Modal.Header closeButton>
                    <Modal.Title>
                        {this.state.mode=="edit"?"Edit Pipeline":"New Pipeline"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                            <Row>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-name">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            disabled = {this.state.mode=='edit'}
                                            value={this.state.pipeline.name}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.name = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-team">
                                        <Form.Label>Team</Form.Label>
                                        <Form.Control
                                            value={this.state.pipeline.team}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.team = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-category">
                                        <Form.Label>Category</Form.Label>
                                        <Form.Control
                                            value={this.state.pipeline.category}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.category = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="pipeline-description">
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control as="textarea" rows="5"
                                            value={this.state.pipeline.description}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline.description = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <h2>Required dataset instances</h2>
                                    <Table hover bordered  size="sm" >
                                        <thead className="thead-dark">
                                            <tr>
                                                <th className="c-tc-icon1"></th>
                                                <th>Name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                this.state.pipeline.requiredDSIs.map(requiredDSI => {
                                                    return (
                                                        <tr key={requiredDSI}>
                                                            <td className="align-middle">
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={event => this.deleteRequiredDSI(requiredDSI)}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                            </td>
                                                            <td className="align-middle">{requiredDSI}</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                            <tr>
                                                <td className="align-middle">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={event => {
                                                            const v = $("#requiredDSI_to_add").val();
                                                            this.addRequiredDSI(v);
                                                            $("#requiredDSI_to_add").val('');
                                                        }}
                                                    >
                                                        <Icon.Plus />
                                                    </Button>
                                                </td>
                                                <td>
                                                    <Form.Control id="requiredDSI_to_add"/>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        disabled = {this.state.mode=='edit'}
                                        name="pipeline-type"
                                        inline
                                        label="Sequential"
                                        type="radio"
                                        checked={this.state.pipeline.type=="sequential"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.pipeline.type = "sequential";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        disabled = {this.state.mode=='edit'}
                                        name="pipeline-type"
                                        inline
                                        label="External"
                                        type="radio"
                                        checked={this.state.pipeline.type=="external"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.pipeline.type = "external";
                                                return state;
                                            })
                                        }}
                                    />
                                </Col>
                            </Row>
                            <Row
                                className={this.state.pipeline.type=="sequential"?"d-block":"d-none"}
                            >
                                <Col>
                                    <h2 className="c-ib">Tasks</h2>
                                    <Button
                                        className="c-vc ml-2"
                                        size="sm"
                                        onClick={this.addTask}
                                    >
                                        Add Task
                                    </Button>
                                </Col>
                            </Row>
                            <Row
                                className={this.state.pipeline.type=="sequential"?"d-block":"d-none"}
                            >
                                <Col>
                                    <Table hover bordered size="sm">
                                        <thead className="thead-dark">
                                            <tr>
                                                <th className="c-tc-icon2"></th>
                                                <th>Name</th>
                                                <th>Type</th>
                                                <th>Application</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {
                                            this.state.pipeline.tasks.map((task) => {
                                                return (
                                                    <tr key={task.name}>
                                                        <td className="align-middle">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="mr-2"
                                                                onClick={event => {this.deleteTask(task)}}
                                                            >
                                                                <Icon.X />
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={event => {this.editTask(task)}}
                                                            >
                                                                <Icon.Pencil />
                                                            </Button>
                                                        </td>
                                                        <td className="align-middle">{task.name}</td>
                                                        <td className="align-middle">{task.type}</td>
                                                        <td className="align-middle">{this.getApplicationName(task)}</td>
                                                    </tr>
                                                )
                                            })
                                        }
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                            <Row
                                className={this.state.pipeline.type=="external"?"d-block":"d-none"}
                            >
                                <Col>
                                    <Form.Group as={Row} controlId="pipeline-dag-id">
                                        <Form.Label column sm={2}>DAG ID</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState( state => {
                                                        state.pipeline.dag_id = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>

                        <Row>
                            <Col>
                                <SequentialTaskEditor
                                    ref={this.theTaskEditorRef}
                                    onSave={this.onTaskSaved}
                                    applications={this.props.applications}
                                />
                            </Col>
                        </Row>

                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                    <Button variant="primary" onClick={this.onSave}>Save changes</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import * as Icon from 'react-bootstrap-icons'
import {SQLStepEditor} from './sql_step_editor.jsx'

const _ = require('lodash');

/*********************************************************************************
 * Purpose: Edit a Task inside a Pipeline
 *
 * Props
 *     applications: a list of all possible applications
 *                   each application must has field 'id' and 'name'
 *     onSave   : called when user hit "Save Changes", onSave(task) is called
 *     onCancel : called when user hit "Close" or close the dialog without save the change
 *
 */
export class SequentialTaskEditor extends React.Component {
    theSQLEditorRef = React.createRef();

    initTaskValue = () => {
        return {
            name: '',
            description: '',
            type: 'spark-sql',
            args: '{}',
            steps: [],
            application_id: '',
        }
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        task: this.initTaskValue(),
    };

    app_options = () => {
        return _.concat({
            id: '',
            name: '-- Please select application --'
        }, this.props.applications);


    }

    onClose = () => {
        if (this.props.onCancel) {
            this.setState({show: false}, this.props.onCancel);
        } else {
            this.setState({show: false});
        }
    };

    onSave = () => {
        const savedTask = _.cloneDeep(this.state.task);
        this.setState({show: false}, () => {this.props.onSave(savedTask)});
    };

    openDialog = (task) => {
        if (task) {
            this.setState({
                show: true,
                mode: "edit",
                task: task
            });
        } else {
            this.setState({
                show: true,
                mode: "new",
                task: this.initTaskValue()
            });
        }
    };

    addStep = () => {
        this.theSQLEditorRef.current.openDialog();
    };

    deleteSQLStep = step => {
        this.setState(state => {
            const new_steps = state.task.steps.filter(s => s.name != step.name);
            state.task.steps = new_steps;
            return state;
        });
    };

    editSQLStep = step => {
        this.theSQLEditorRef.current.openDialog(step);
    };

    onSQLStepSaved = (step) => {
        this.setState(state => {
            const idx = state.task.steps.findIndex(stepX => stepX.name == step.name);
            if (idx >= 0) {
                state.task.steps[idx] = step;
            } else {
                state.task.steps.push(step);
            }
            return state;
        });
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
                        {this.state.mode=="edit"?"Edit Task":"New Task"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Row>
                            <Col>
                                <Button
                                    variant={"primary"}
                                    size="sm"
                                    onClick={this.show}
                                    className={this.state.show?"d-none":"d-block"}
                                >
                                    New Task
                                </Button>
                            </Col>
                        </Row>
                        <div className={this.state.show?"d-block":"d-none"}>
                            <Row>
                                <Col>
                                    <Form.Group controlId="task-name">
                                        <Form.Label>Task name</Form.Label>
                                        <Form.Control
                                            disabled = {this.state.mode=='edit'}
                                            value={this.state.task.name}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.task.name = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="task-description">
                                        <Form.Label>Task Description</Form.Label>
                                        <Form.Control
                                            value={this.state.task.description}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.task.description = v;
                                                    return state;
                                                });
                                            }}
                                            as="textarea" rows="5"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        name="task-type"
                                        inline
                                        label="Spark-SQL"
                                        type="radio"
                                        checked={this.state.task.type=="spark-sql"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.task.type = "spark-sql";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        name="task-type"
                                        inline
                                        label="other"
                                        type="radio"
                                        checked={this.state.task.type=="other"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.task.type = "other";
                                                return state;
                                            })
                                        }}
                                    />
                                </Col>
                            </Row>
                            {/* other only fields */}
                            <Row className={this.state.task.type=="other"?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group controlId="task-app">
                                        <Form.Label>Application</Form.Label>
                                        <Form.Control
                                            as="select"
                                            value={this.state.task.application_id}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.task.application_id = v;
                                                    return state;
                                                });
                                            }}
                                        >
                                            {
                                                this.app_options().map(application => {
                                                    return (
                                                        <option
                                                            key={application.id}
                                                            value={application.id}
                                                        >
                                                            {application.name}
                                                        </option>
                                                    );
                                                })
                                            }
                                        </Form.Control>

                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className={this.state.task.type=="other"?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group controlId="task-args">
                                        <Form.Label>Task Arguments</Form.Label>
                                        <Form.Control
                                            value={this.state.task.args}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.task.args = v;
                                                    return state;
                                                });
                                            }}
                                            as="textarea"
                                            rows="5"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className={this.state.task.type=="spark-sql"?"d-block":"d-none"}>
                                <Col>
                                    <h2 className="c-ib">Steps</h2>
                                    <Button
                                        className="c-vc ml-2"
                                        size="sm"
                                        onClick={this.addStep}
                                    >
                                        Add Step
                                    </Button>
                                </Col>
                            </Row>

                            <Row className={this.state.task.type=="spark-sql"?"d-block":"d-none"}>
                                <Col>
                                    <Table size="sm" hover>
                                        <thead className="thead-dark">
                                            <tr>
                                                <th className="c-tc-icon2"></th>
                                                <th>Name</th>
                                                <th>Alias</th>
                                                <th>Write To</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {
                                            this.state.task.steps.map((step) => {
                                                return (
                                                    <tr key={step.name}>
                                                        <td className="align-middle">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                className="mr-2"
                                                                onClick={event => {this.deleteSQLStep(step)}}
                                                            >
                                                                <Icon.X />
                                                            </Button>
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={event => {this.editSQLStep(step)}}
                                                            >
                                                                <Icon.Pencil />
                                                            </Button>
                                                        </td>
                                                        <td className="align-middle">{step.name}</td>
                                                        <td className="align-middle">{step.alias}</td>
                                                        <td className="align-middle">{step.output.location}</td>
                                                    </tr>
                                                )
                                            })
                                        }
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                            <Row className={this.state.task.type=="spark-sql"?"d-block":"d-none"}>
                                <Col>
                                    <SQLStepEditor
                                        ref={this.theSQLEditorRef}
                                        onSave={this.onSQLStepSaved}
                                    />
                                </Col>
                            </Row>

                        </div>
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

import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'

import * as Icon from 'react-bootstrap-icons'
import {SQLStepEditor} from './sql_step_editor.jsx'
import {is_json_string} from '/common_lib.js'
import {AlertBox} from '/components/generic/alert/alert.jsx'

import './pipeline.scss'

const _ = require('lodash');

/*********************************************************************************
 * Purpose: Edit a Task inside a Pipeline
 *
 * Props
 *     applications: a list of all possible applications
 *                   each application must has field 'id' and 'name'
 *     onSave   : called when user hit "Save Changes", onSave(task) is called
 *
 */
export class SequentialTaskEditor extends React.Component {
    theSQLEditorRef = React.createRef();
    theAlertBoxRef  = React.createRef();

    initTaskValue = () => {
        return {
            name: '',
            description: '',
            type: 'spark-sql',
            args: '{}',
            spark_opts: '{}',
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
        this.setState({show: false});
    };

    onSave = () => {
        if (!is_json_string(this.state.task.args)) {
            this.theAlertBoxRef.current.show("Task Arguments must be a JSON string");
            return
        }
        const task = _.cloneDeep(this.state.task);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, task)});
    };

    openDialog = (mode, task) => {
        if (mode === "view" || mode === "edit") {
            this.setState({
                show: true,
                mode: mode,
                task: _.cloneDeep(task)
            });
        } else {
            this.setState({
                show: true,
                mode: mode,
                task: this.initTaskValue()
            });
        }
    };

    addStep = () => {
        this.theSQLEditorRef.current.openDialog("new");
    };

    deleteSQLStep = step => {
        this.setState(state => {
            const new_steps = state.task.steps.filter(s => s.name != step.name);
            state.task.steps = new_steps;
            return state;
        });
    };

    editSQLStep = step => {
        this.theSQLEditorRef.current.openDialog("edit", step);
    };

    viewSQLStep = step => {
        this.theSQLEditorRef.current.openDialog("view", step);
    };

    onSQLStepSaved = (mode, step) => {
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

    get_title = () => {
        if (this.state.mode === "new") {
            return "new Task";
        } else if (this.state.mode === "edit") {
            return "edit Task";
        } else if (this.state.mode === "view") {
            return "Task"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    canSave = () => {
        return this.state.task.name;
    };

    render() {
        return (
            <Modal
                dialogClassName="task-editor"
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='xl'
                scrollable
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <AlertBox ref={this.theAlertBoxRef}/>
                        <Tabs defaultActiveKey="BasicInfo" transition={false}>
                            <Tab eventKey="BasicInfo" title="Basic Info">
                                <Container className="pt-2">
                                    <Row>
                                        <Col>
                                            <Form.Group controlId="task-name">
                                                <Form.Label>Name</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    disabled = {this.state.mode==='edit' || this.state.mode==='view'}
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
                                                <Form.Label>Description</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    disabled = {this.state.mode==='view'}
                                                    value={this.state.task.description}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState(state => {
                                                            state.task.description = v;
                                                            return state;
                                                        });
                                                    }}
                                                    as="textarea" rows="3"
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
                                                disabled = {this.state.mode==='view'}
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
                                                label="Dummy"
                                                type="radio"
                                                disabled = {this.state.mode==='view'}
                                                checked={this.state.task.type=="dummy"}
                                                onChange={() => {
                                                    this.setState(state => {
                                                        state.task.type = "dummy";
                                                        return state;
                                                    })
                                                }}
                                            />
                                            <Form.Check
                                                name="task-type"
                                                inline
                                                label="Application"
                                                type="radio"
                                                disabled = {this.state.mode==='view'}
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

                                    {
                                    ((this.state.task.type == "spark-sql") || (this.state.task.type == "other")) &&
                                        <Row>
                                            <Col>
                                                <Form.Group controlId="spark-opts">
                                                    <Form.Label>Spark Job Options</Form.Label>
                                                    <Form.Control
                                                        className="monofont"
                                                        value={this.state.task.spark_opts}
                                                        disabled = {this.state.mode==='view'}
                                                        onChange={(event) => {
                                                            const v = event.target.value;
                                                            this.setState(state => {
                                                                state.task.spark_opts = v;
                                                                return state;
                                                            });
                                                        }}
                                                        as="textarea"
                                                        rows="3"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    }
                                </Container>
                            </Tab>
                            { this.state.task.type === "other" &&
                            <Tab eventKey="Application" title="Application">
                                <Container className="pt-2">
                                    <Row>
                                        <Col>
                                            <Form.Group controlId="task-app">
                                                <Form.Label>Application</Form.Label>
                                                <Form.Control
                                                    as="select"
                                                    disabled = {this.state.mode==='view'}
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
                                    <Row>
                                        <Col>
                                            <Form.Group controlId="task-args">
                                                <Form.Label>Task Arguments</Form.Label>
                                                <Form.Control
                                                    className="monofont"
                                                    value={this.state.task.args}
                                                    disabled = {this.state.mode==='view'}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState(state => {
                                                            state.task.args = v;
                                                            return state;
                                                        });
                                                    }}
                                                    as="textarea"
                                                    rows="3"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Container>
                            </Tab>
                            }
                            {
                                this.state.task.type === "spark-sql" &&
                                <Tab eventKey="SparkSQL" title="Spark-SQL">
                                    <Container className="pt-2">
                                        <Row>
                                            <Col>
                                                <h4 className="c-ib">Steps</h4>
                                                <Button
                                                    disabled = {this.state.mode==='view'}
                                                    className="c-vc ml-2"
                                                    size="sm"
                                                    onClick={this.addStep}
                                                >
                                                    Add Step
                                                </Button>
                                            </Col>
                                        </Row>

                                        <Row>
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
                                                                            disabled = {this.state.mode==='view'}
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
                                                                            onClick={event => {
                                                                                if (this.state.mode=="view") {
                                                                                    this.viewSQLStep(step);
                                                                                } else {
                                                                                    this.editSQLStep(step);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {
                                                                                this.state.mode==='view'?<Icon.Info/>:<Icon.Pencil />
                                                                            }
                                                                        </Button>
                                                                    </td>
                                                                    <td className="align-middle">{step.name}</td>
                                                                    <td className="align-middle">{step.alias}</td>
                                                                    <td className="align-middle">{step.output?step.output.location:""}</td>
                                                                </tr>
                                                            )
                                                        })
                                                    }
                                                    </tbody>
                                                </Table>
                                            </Col>
                                        </Row>
                                    </Container>
                                </Tab>
                            }
                        </Tabs>
                        <div className={this.state.show?"d-block":"d-none"}>

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
                    {
                        (
                            this.state.mode === "edit" ||
                            this.state.mode === "new"
                        ) &&
                        <Button variant="primary"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                            size="sm"
                        >
                            Save changes
                        </Button>
                    }
                    <Button variant="secondary" size="sm" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

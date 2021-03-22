import React from 'react';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import * as Icon from 'react-bootstrap-icons';

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';
import {SQLStepEditor} from './sql_step_editor.jsx';
import {is_json_string} from '/common_lib.js';



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
export class SequentialTaskEditor extends StandardDialogbox {
    theSQLEditorRef = React.createRef();

    initTaskValue = () => {
        return {
            name: '-- enter name --',
            description: '',
            type: 'spark-sql',
            args: '{}',
            spark_opts: '{}',
            steps: [],
            application_id: '',
        }
    };

    dialogClassName = "task-editor";

    isNameValid = (task) => {
        return task.name.trim().length > 0;
    }

    isSparkOptsValid = (task) => {
        if (task.type !== "spark-sql" && task.type !== "other") {
            return true;
        }
        return is_json_string(task.spark_opts);
    };

    app_options = () => {
        return _.concat({
            id: '',
            name: '-- Please select application --'
        }, this.props.applications);
    }

    onSave = () => {
        const {task, mode} = this.state.payload;
        const taskToSave = _.cloneDeep(task);

        return this.props.onSave(mode, taskToSave);
    };

    canSave = () => {
        const {task} = this.state.payload;

        return this.isNameValid(task) && this.isSparkOptsValid(task);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, task} = openArgs;
        if (mode === "view" || mode === "edit") {
            return {
                mode: mode,
                task: _.cloneDeep(task),
            };
        } else if (mode == "new") {
            return {
                mode: mode,
                task: this.initTaskValue(),
            };
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;

        if (mode === "new") {
            return "new Task";
        } else if (mode === "edit") {
            return "edit Task";
        } else if (mode === "view") {
            return "Task"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };


    addStep = () => {
        this.theSQLEditorRef.current.openDialog({mode: "new"});
    };

    deleteSQLStep = step => {
        this.setState(state => {
            const new_steps = state.payload.task.steps.filter(s => s.name != step.name);
            state.payload.task.steps = new_steps;
            return state;
        });
    };

    editSQLStep = step => {
        this.theSQLEditorRef.current.openDialog({mode: "edit", step: step});
    };

    viewSQLStep = step => {
        this.theSQLEditorRef.current.openDialog({mode: "view", step: step});
    };

    onSQLStepSaved = (mode, step) => {
        this.setState(state => {
            const idx = state.payload.task.steps.findIndex(stepX => stepX.name == step.name);
            if (idx >= 0) {
                state.payload.task.steps[idx] = step;
            } else {
                state.payload.task.steps.push(step);
            }
            return state;
        });
    };

    renderBody = () => {
        const {task, mode} = this.state.payload;
        return (
            <div>
                <Tabs defaultActiveKey="BasicInfo" transition={false}>
                    <Tab eventKey="BasicInfo" title="Basic Info">
                        <Container fluid className="pt-2">
                            <Row>
                                <Col>
                                    <Form.Group controlId="task-name">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            disabled = {mode==='edit' || mode==='view'}
                                            value={task.name}
                                            isInvalid={!this.isNameValid(task)}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.payload.task.name = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                        <Form.Control.Feedback tooltip type="invalid">
                                            Cannot be empty.
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="task-description">
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            disabled = {mode==='view'}
                                            value={task.description}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.payload.task.description = v;
                                                    return state;
                                                });
                                            }}
                                            as="textarea" rows="7"
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
                                        disabled = {mode==='view'}
                                        checked={task.type=="spark-sql"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.task.type = "spark-sql";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        name="task-type"
                                        inline
                                        label="Dummy"
                                        type="radio"
                                        disabled = {mode==='view'}
                                        checked={task.type=="dummy"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.task.type = "dummy";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        name="task-type"
                                        inline
                                        label="Application"
                                        type="radio"
                                        disabled = {mode==='view'}
                                        checked={task.type=="other"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.task.type = "other";
                                                return state;
                                            })
                                        }}
                                    />
                                </Col>
                            </Row>

                            {
                            ((task.type == "spark-sql") || (task.type == "other")) &&
                                <Row>
                                    <Col>
                                        <Form.Group controlId="spark-opts">
                                            <Form.Label>Spark Job Options</Form.Label>
                                            <Form.Control
                                                className="monofont"
                                                disabled = {mode==='view'}
                                                value={task.spark_opts}
                                                isInvalid={!this.isSparkOptsValid(task)}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.payload.task.spark_opts = v;
                                                        return state;
                                                    });
                                                }}
                                                as="textarea"
                                                rows="7"
                                            />
                                            <Form.Control.Feedback tooltip type="invalid">
                                                Must be a valid JSON object.
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            }
                        </Container>
                    </Tab>
                    { task.type === "other" &&
                    <Tab eventKey="Application" title="Application">
                        <Container fluid className="pt-2">
                            <Row>
                                <Col>
                                    <Form.Group controlId="task-app">
                                        <Form.Label>Application</Form.Label>
                                        <Form.Control
                                            as="select"
                                            disabled = {mode==='view'}
                                            value={task.application_id}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.payload.task.application_id = v;
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
                                            value={task.args}
                                            disabled = {mode==='view'}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.payload.task.args = v;
                                                    return state;
                                                });
                                            }}
                                            as="textarea"
                                            rows="18"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Container>
                    </Tab>
                    }
                    {
                        task.type === "spark-sql" &&
                        <Tab eventKey="SparkSQL" title="Spark-SQL">
                            <Container fluid className="pt-2">
                                <Row>
                                    <Col>
                                        <h4 className="c-ib">Steps</h4>
                                        <Button
                                            disabled = {mode==='view'}
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
                                                task.steps.map((step) => {
                                                    return (
                                                        <tr key={step.name}>
                                                            <td className="align-middle">
                                                                <Button
                                                                    disabled = {mode==='view'}
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
                                                                        if (mode=="view") {
                                                                            this.viewSQLStep(step);
                                                                        } else {
                                                                            this.editSQLStep(step);
                                                                        }
                                                                    }}
                                                                >
                                                                    {
                                                                        mode==='view'?<Icon.Info/>:<Icon.Pencil />
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
                {
                    task.type=="spark-sql" && <Form.Row>
                        <Col>
                            <SQLStepEditor
                                ref={this.theSQLEditorRef}
                                onSave={this.onSQLStepSaved}
                            />
                        </Col>
                    </Form.Row>
                }
            </div>
        );
    }
}

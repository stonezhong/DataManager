import React from 'react';

import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import * as Icon from 'react-bootstrap-icons';

import { v4 as uuidv4 } from 'uuid';

import {SequentialTaskEditor} from './task_editor.jsx';
import {ApplicationLink} from '/components/business/application';
import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';

import {get_unsigned_integer} from '/common_lib'

import "./pipeline.scss"

const _ = require("lodash");

function get_integer(v) {
    if (!v.match("^(0|([1-9][0-9]*))$")) {
        return null;
    }
    return parseInt(v);
}

/*********************************************************************************
 * Purpose: Edit a Pipeline
 *
 * Props
 *     applications: a list of all possible applications
 *                   each application must has field 'id' and 'name'
 *     onSave   : onSave(mode, pipeline) is called when user save the change
 *
 */
export class PipelineEditor extends StandardDialogbox {
    theTaskEditorRef = React.createRef();

    initPipelineValue = () => {
        return {
            name: '-- enter pipeline name --',
            team: '-- enter team --',
            category: '-- enter category --',
            description: '',
            // belong to the context
            type        : 'simple-flow',
            dag_id      : '',                // for external pipeline
            requiredDSIs: [],          // required dataset instances
            startOffset : "0",           // the minutes for when this pipeline should start from the scheduled due time
            tasks       : [],
            dependencies: [],          // e.g. [{id: 1, src:'foo', dst: 'bar'},... ], means foo depend on bar
            _toAddAssertPath: '',
            _srcDepTaskName: '',
            _dstDepTaskName: '',
        };
    };

    dialogClassName = "pipeline-editor";

    isNameValid = (pipeline) => {
        return pipeline.name.trim().length > 0;
    }

    isTeamValid = (pipeline) => {
        return pipeline.team.trim().length > 0;
    }

    isCategoryValid = (pipeline) => {
        return pipeline.category.trim().length > 0;
    }

    isStartOffsetValid = (pipeline) => {
        const startOffset = get_unsigned_integer(pipeline.startOffset);
        return (startOffset !== null && startOffset >= 0);
    };

    onSave = () => {
        const {pipeline, mode} = this.state.payload;

        const pipelineToSave = _.cloneDeep(pipeline);
        delete pipelineToSave._toAddAssertPath;
        delete pipelineToSave._srcDepTaskName;
        delete pipelineToSave._dstDepTaskName;
        pipelineToSave.name = pipelineToSave.name.trim();

        return this.props.onSave(mode, pipelineToSave);
    };

    canSave = () => {
        const {pipeline} = this.state.payload;

        return this.isNameValid(pipeline) &&
            this.isTeamValid(pipeline) &&
            this.isCategoryValid(pipeline) &&
            this.isStartOffsetValid(pipeline);
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };


    // user shall convert the django output to native pipeline format
    // using pipeline_from_django_model
    onOpen = openArgs => {
        const {mode, pipeline} = openArgs;
        if (mode === "view" || mode === "edit") {
            const myPipeline = _.cloneDeep(pipeline);
            myPipeline._toAddAssertPath = '';
            myPipeline._srcDepTaskName = '';
            myPipeline._dstDepTaskName = '';

            if (!('startOffset' in myPipeline)) {
                myPipeline.startOffset = "0";
            }
            if (!('dependencies' in myPipeline)) {
                myPipeline.dependencies = [];
            }
            return {
                mode: mode,
                pipeline: myPipeline,
            };
        } else {
            return {
                mode: mode,
                pipeline: this.initPipelineValue(),
            };
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Pipeline";
        } else if (mode === "edit") {
            return "edit Pipeline";
        } else if (mode === "view") {
            return "Pipeline"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    renderBody = () => {
        const {pipeline, mode} = this.state.payload;
        return (
            <Form>
                <Tabs
                    defaultActiveKey="BasicInfo"
                    transition={false}
                >
                    <Tab eventKey="BasicInfo" title="Basic Info">
                        <Container fluid className="pt-2">
                            <Form.Row>
                                <Form.Group as={Col} controlId="pipeline-name">
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        disabled = {mode==='edit'||mode==='view'}
                                        value={pipeline.name}
                                        isInvalid={!this.isNameValid(pipeline)}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.payload.pipeline.name = v;
                                                return state;
                                            });
                                        }}
                                    />
                                    <Form.Control.Feedback tooltip type="invalid">
                                        Cannot be empty.
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group as={Col} controlId="pipeline-team">
                                    <Form.Label>Team</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        disabled = {mode==='view'}
                                        value={pipeline.team}
                                        isInvalid={!this.isTeamValid(pipeline)}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.payload.pipeline.team = v;
                                                return state;
                                            });
                                        }}
                                    />
                                    <Form.Control.Feedback tooltip type="invalid">
                                        Cannot be empty.
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group as={Col} controlId="pipeline-category">
                                    <Form.Label>Category</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        disabled = {mode==='view'}
                                        value={pipeline.category}
                                        isInvalid={!this.isCategoryValid(pipeline)}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.payload.pipeline.category = v;
                                                return state;
                                            });
                                        }}
                                    />
                                    <Form.Control.Feedback tooltip type="invalid">
                                        Cannot be empty.
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Form.Group as={Col} controlId="pipeline-description">
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control as="textarea" rows="5"
                                        size="sm"
                                        disabled = {mode==='view'}
                                        value={pipeline.description}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.payload.pipeline.description = v;
                                                return state;
                                            });
                                        }}
                                    />
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Form.Group as={Col} sm={3} controlId="pipeline-type">
                                    <Form.Label className="pr-2" >Type</Form.Label>
                                    <Form.Check
                                        size="sm"
                                        disabled = {mode==='view'}
                                        name="pipeline-type"
                                        inline
                                        label="simple-flow"
                                        type="radio"
                                        checked={pipeline.type=="simple-flow"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.pipeline.type = "simple-flow";
                                                return state;
                                            })
                                        }}
                                    />
                                    <Form.Check
                                        size="sm"
                                        disabled = {mode==='view'}
                                        name="pipeline-type"
                                        inline
                                        label="external"
                                        type="radio"
                                        checked={pipeline.type==="external"}
                                        onChange={() => {
                                            this.setState(state => {
                                                state.payload.pipeline.type = "external";
                                                return state;
                                            })
                                        }}
                                    />
                                </Form.Group>
                                <Form.Group as={Col} sm={3} controlId="start-Offset">
                                    <Form.Label>Start offset (in minutes)</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        disabled = {mode==='view'}
                                        value={pipeline.startOffset}
                                        isInvalid={!this.isStartOffsetValid(pipeline)}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.payload.pipeline.startOffset = v;
                                                return state;
                                            });
                                        }}
                                    />
                                    <Form.Control.Feedback tooltip type="invalid">
                                        Must be a integer greater or equals to zero
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Col>
                                    <h4>Required assets</h4>
                                    <Table hover bordered  size="sm" >
                                        <thead className="thead-dark">
                                            <tr>
                                                <th className="c-tc-icon1"></th>
                                                <th>Asset Path</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                pipeline.requiredDSIs.map(requiredDSI => {
                                                    return (
                                                        <tr key={requiredDSI}>
                                                            <td className="align-middle">
                                                                <Button
                                                                    disabled = {mode==='view'}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={ event => {
                                                                        this.setState(state => {
                                                                            _.remove(state.payload.pipeline.requiredDSIs, i => i===requiredDSI);
                                                                            return state;
                                                                        });
                                                                    }}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                            </td>
                                                            <td className="align-middle">{requiredDSI}</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                            {
                                                (mode === 'edit' || mode === 'new') &&
                                                <tr>
                                                    <td className="align-middle">
                                                        <Button
                                                            disabled = {!pipeline._toAddAssertPath.trim()}
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={event => {
                                                                this.setState(state => {
                                                                    const v = state.payload.pipeline._toAddAssertPath.trim();
                                                                    state.payload.pipeline.requiredDSIs.push(v);
                                                                    state.payload.pipeline._toAddAssertPath = '';
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            <Icon.Plus />
                                                        </Button>
                                                    </td>
                                                    <td>
                                                        <Form.Control id="requiredDSI_to_add"
                                                            size="sm"
                                                            value={pipeline._toAddAssertPath}
                                                            onChange={(event) => {
                                                                const v = event.target.value;
                                                                this.setState(state => {
                                                                    state.payload.pipeline._toAddAssertPath = v;
                                                                    return state;
                                                                })
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            }
                                        </tbody>
                                    </Table>
                                </Col>
                            </Form.Row>
                            {
                                (pipeline.type==="external") &&
                                <Form.Row>
                                    <Form.Group as={Col} controlId="pipeline-dag-id">
                                        <Form.Label column sm={2}>DAG ID</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                disabled = {mode==='view'}
                                                value={pipeline.dag_id}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState( state => {
                                                        state.payload.pipeline.dag_id = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Form.Row>
                            }
                        </Container>
                    </Tab>
                    {
                        (pipeline.type==="simple-flow") &&  <Tab eventKey="Tasks" title="Tasks">
                            <Container fluid className="pt-2">
                                <Form.Row>
                                    <Col>
                                        <h4 className="c-ib">Tasks</h4>
                                        <Button
                                            disabled = {mode==='view'}
                                            className="c-vc ml-2"
                                            size="sm"
                                            onClick={this.addTask}
                                        >
                                            Add Task
                                        </Button>
                                    </Col>
                                </Form.Row>
                                <Form.Row>
                                    <Col>
                                        <Table hover bordered size="sm" className="task-table">
                                            <thead className="thead-dark">
                                                <tr>
                                                    <th data-role="tools"></th>
                                                    <th data-role="name">Name</th>
                                                    <th data-role="type">Type</th>
                                                    <th data-role="application">Application</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {
                                                pipeline.tasks.map((task) => {
                                                    return (
                                                        <tr key={task.name}>
                                                            <td data-role="type">
                                                                <Button
                                                                    disabled = {mode==='view'}
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
                                                                    onClick={event => {
                                                                        if (mode==='view') {
                                                                            this.viewTask(task)
                                                                        } else {
                                                                            this.editTask(task)
                                                                        }
                                                                    }}
                                                                >
                                                                    { mode === "view"?<Icon.Info />:<Icon.Pencil /> }
                                                                </Button>
                                                            </td>
                                                            <td data-role="name">{task.name}</td>
                                                            <td data-role="type">{task.type}</td>
                                                            <td data-role="application">
                                                                { this.getApplication(task) &&
                                                                    <ApplicationLink application={this.getApplication(task)} />
                                                                }
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            }
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Form.Row>
                                <Form.Row>
                                    <Col>
                                        <h4>Dependency</h4>
                                        <Table hover bordered size="sm" className="dep-table">
                                            <thead className="thead-dark">
                                                <tr>
                                                    <th data-role="tools"></th>
                                                    <th data-role="dst-task">First</th>
                                                    <th data-role="then"><Icon.ArrowRight /></th>
                                                    <th data-role="src-task">Next Task</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {
                                                    pipeline.dependencies.map(dep =>
                                                        <tr key={dep.id}>
                                                            <td>
                                                                <Button
                                                                    disabled = {mode==='view'}
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={ event => {
                                                                        this.setState(state => {
                                                                            _.remove(state.payload.pipeline.dependencies, i => i.id === dep.id);
                                                                            return state;
                                                                        });
                                                                    }}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                            </td>
                                                            <td>{dep.dst}</td>
                                                            <td><center><Icon.ArrowRight /></center></td>
                                                            <td>{dep.src}</td>
                                                        </tr>
                                                    )
                                                }
                                                <tr>
                                                    <td>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            disabled={
                                                                (pipeline._srcDepTaskName === '') ||
                                                                (pipeline._dstDepTaskName === '') ||
                                                                (pipeline._srcDepTaskName === pipeline._dstDepTaskName)
                                                            }
                                                            onClick={ event => {
                                                                this.setState(state => {
                                                                    const dep = {
                                                                        id: uuidv4(),
                                                                        src: state.payload.pipeline._srcDepTaskName,
                                                                        dst: state.payload.pipeline._dstDepTaskName
                                                                    };
                                                                    state.payload.pipeline._srcDepTaskName = '';
                                                                    state.payload.pipeline._dstDepTaskName = '';
                                                                    state.payload.pipeline.dependencies.push(dep);
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            Add
                                                        </Button>
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            as="select"
                                                            size="sm"
                                                            disabled = {mode==='view'}
                                                            value={pipeline._dstDepTaskName}
                                                            onChange={event => {
                                                                const v = event.target.value;
                                                                this.setState(state => {
                                                                    state.payload.pipeline._dstDepTaskName = v;
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            <option key="" value="">--- Please Select Task ---</option>
                                                            {pipeline.tasks.map(task =>
                                                                <option key={task.name} value={task.name}>{task.name}</option>
                                                            )}
                                                        </Form.Control>
                                                    </td>
                                                    <td>
                                                        <center><Icon.ArrowRight /></center>
                                                    </td>
                                                    <td>
                                                        <Form.Control
                                                            as="select"
                                                            size="sm"
                                                            disabled = {mode==='view'}
                                                            value={pipeline._srcDepTaskName}
                                                            onChange={event => {
                                                                const v = event.target.value;
                                                                this.setState(state => {
                                                                    state.payload.pipeline._srcDepTaskName = v;
                                                                    return state;
                                                                });
                                                            }}
                                                        >
                                                            <option key="" value="">--- Please Select Task ---</option>
                                                            {pipeline.tasks.map(task =>
                                                                <option key={task.name} value={task.name}>{task.name}</option>
                                                            )}
                                                        </Form.Control>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </Col>
                                </Form.Row>
                            </Container>
                        </Tab>
                    }
                </Tabs>

                <SequentialTaskEditor
                    ref={this.theTaskEditorRef}
                    onSave={this.onTaskSaved}
                    applications={this.props.applications}
                />

            </Form>
        );
    }


    addTask = () => {
        this.theTaskEditorRef.current.openDialog({mode: "new"});
    };

    getApplication = task => {
        if (task.type != "other") {
            return null;
        }
        return _.find(this.props.applications, p => p.id==task.application_id);
    };

    deleteTask = (task) => {
        this.setState(state => {
            const new_tasks = state.payload.pipeline.tasks.filter(t => t.name != task.name);
            state.payload.pipeline.tasks = new_tasks;
            const new_dependencies = state.payload.pipeline.dependencies.filter(
                t => (t.src!==task.name)&&(t.dst!==task.name)
            )
            state.payload.pipeline.dependencies = new_dependencies;
            return state;
        });
    };

    onTaskSaved = (mode, task) => {
        this.setState(state => {
            const idx = state.payload.pipeline.tasks.findIndex(taskX => taskX.name == task.name);
            if (idx >= 0) {
                state.payload.pipeline.tasks[idx] = task;
            } else {
                state.payload.pipeline.tasks.push(task);
            }
            return state;
        });
    };

    editTask = task => {
        this.theTaskEditorRef.current.openDialog({mode: "edit", task: task});
    };

    viewTask = task => {
        this.theTaskEditorRef.current.openDialog({mode: "view", task: task});
    };
}

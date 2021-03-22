import React from 'react';

import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import * as Icon from 'react-bootstrap-icons';

import "./timer.scss";
import {is_json_string, is_valid_datetime} from '/common_lib.js';
import {DataTable} from '/components/generic/datatable/main.jsx';
import {AppIcon} from '/components/generic/icons/main.jsx';

const _ = require('lodash');

import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';

function timer_native_to_ui(native_timer) {
    // this is a timer for pipeline
    const ui_timer = _.cloneDeep(native_timer);
    if (ui_timer.end_at === null) {
        ui_timer.end_at = '';
    }
    return ui_timer;
}

function timer_ui_to_native(ui_timer) {
    // this is a timer for pipeline
    const native_timer = _.cloneDeep(ui_timer);
    if (native_timer.end_at === '') {
        native_timer.end_at = null;
    }
    return native_timer;
}

/*********************************************************************************
 * Purpose: edit or view a timer, or create a new timer
 * TODO: pagination
 *
 * Props
 *     onSave   : a callback, will be called if user hit "save changes" button
 *                onSave(mode, timer) will be called, mode is either "new" or "edit"
 *
 */
export class TimerEditor extends StandardDialogbox {
    initTimerValue = () => {
        return {
            name: '',
            description: '',
            team: '',
            paused: false,
            interval_unit: "DAY",
            interval_amount: 1,
            start_from: '2020-01-01 00:00:00',
            topic: 'pipeline',
            context: '{}',
            category: '',
            end_at: '',
        }
    };

    dialogClassName = "timer-editor-modal";

    onSave = () => {
        const {timer, mode} = this.state.payload;

        if (!is_json_string(timer.context)) {
            this.theAlertBoxRef.current.show("Context must be a JSON string");
            return
        }
        if (!is_valid_datetime(timer.start_from, false)) {
            this.theAlertBoxRef.current.show("Start MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }
        if (!is_valid_datetime(timer.start_from, true)) {
            this.theAlertBoxRef.current.show("End MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }

        const native_timer = timer_ui_to_native(timer);
        return this.props.onSave(mode, native_timer);
    };

    canSave = () => {
        const {timer} = this.state.payload;

        return (
            !!timer.name &&
            !!timer.team &&
            !!timer.category &&
            !!timer.start_from
        );
    };

    hasSave = () => {
        const {mode} = this.state.payload;
        return (mode === "edit" || mode === "new");
    };

    onOpen = openArgs => {
        const {mode, timer} = openArgs;
        if (mode === "view" || mode === "edit") {
            return {
                mode: mode,
                timer: _.cloneDeep(timer_native_to_ui(timer))
            };
        } else if (mode === "new") {
            return {
                mode: mode,
                timer: this.initTimerValue(),
            };
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    getTitle = () => {
        const {mode} = this.state.payload;
        if (mode === "new") {
            return "new Scheduler";
        } else if (mode === "edit") {
            return "edit Scheduler";
        } else if (mode === "view") {
            return "Scheduler"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    renderBody = () => {
        const {timer, mode} = this.state.payload;

        return (
            <Form>
                <Form.Group as={Row} controlId="name">
                    <Form.Label column sm={2}>Name</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            disabled = {mode==='edit'||mode==='view'}
                            value={timer.name}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.timer.name = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="description">
                    <Form.Label column sm={2}>Description</Form.Label>
                    <Col sm={10}>
                        <Form.Control as="textarea" rows={3}
                            disabled = {mode==='view'}
                            value={timer.description}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.timer.description = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="paused">
                    <Form.Label column sm={2}>Paused</Form.Label>
                    <Col sm={10}>
                        <Form.Check type="checkbox"
                            className="c-vc"
                            disabled = {mode==='view'}
                            checked={timer.paused}
                            onChange={(event) => {
                                const v = event.target.checked;
                                this.setState(
                                    state => {
                                        state.payload.timer.paused = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="category">
                    <Form.Label column sm={2}>Category</Form.Label>
                    <Col sm={10}>
                        <Form.Control
                            disabled = {mode==='view'}
                            value={timer.category}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.timer.category = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="context">
                    <Form.Label column sm={2}>Context</Form.Label>
                    <Col sm={10}>
                        <Form.Control as="textarea" rows={3}
                            className="monofont"
                            disabled = {mode==='view'}
                            value={timer.context}
                            onChange={(event) => {
                                const v = event.target.value;
                                this.setState(
                                    state => {
                                        state.payload.timer.context = v;
                                        return state;
                                    }
                                )
                            }}
                        />
                    </Col>
                </Form.Group>
                <Row>
                    <Col>
                        <Form.Group as={Row} controlId="author">
                            <Form.Label column sm={2}>Author</Form.Label>
                            <Col sm={10}>
                                {
                                    mode==="new" && <Form.Control
                                        disabled = {true}
                                        value={timer.author}
                                    />
                                }
                            </Col>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group as={Row} controlId="team">
                            <Form.Label column sm={2}>Team</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    disabled = {mode==='view'}
                                    value={timer.team}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.payload.timer.team = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Col>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Form.Group as={Row} controlId="interval">
                            <Form.Label column sm={2}>Interval</Form.Label>
                            <Col sm={10}>
                                <InputGroup className="mb-3">
                                    <Form.Control
                                        disabled = {mode==='view'}
                                        value={timer.interval_amount}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.payload.timer.interval_amount = parseInt(v);
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                    <Form.Control
                                        as="select"
                                        disabled = {mode==='view'}
                                        value={timer.interval_unit}
                                        onChange={event => {
                                            const v = event.target.value;
                                            this.setState(state => {
                                                state.payload.timer.interval_unit = v;
                                                return state;
                                            });
                                        }}
                                    >
                                        <option key="YEAR" value="YEAR">YEAR</option>
                                        <option key="MONTH" value="MONTH">MONTH</option>
                                        <option key="DAY" value="DAY">DAY</option>
                                        <option key="HOUR" value="HOUR">HOUR</option>
                                        <option key="MINUTE" value="MINUTE">MINUTE</option>
                                        <option key="SECOND" value="SECOND">SECOND</option>
                                    </Form.Control>
                                </InputGroup>
                            </Col>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <Form.Group as={Row} controlId="start_from">
                            <Form.Label column sm={2}>Start</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    disabled = {mode==='view'}
                                    value={timer.start_from}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.payload.timer.start_from = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Col>
                        </Form.Group>
                    </Col>
                    <Col>
                        <Form.Group as={Row} controlId="end_at">
                            <Form.Label column sm={2}>End</Form.Label>
                            <Col sm={10}>
                                <Form.Control
                                    disabled = {mode==='view'}
                                    value={timer.end_at}
                                    onChange={(event) => {
                                        const v = event.target.value;
                                        this.setState(
                                            state => {
                                                state.payload.timer.end_at = v;
                                                return state;
                                            }
                                        )
                                    }}
                                />
                            </Col>
                        </Form.Group>
                    </Col>
                </Row>
            </Form>
        );
    }

}

/*********************************************************************************
 * Purpose: Show list of timers
 * TODO: pagination
 *
 * Props
 *     timers   : a list of timers
 *     allowEdit: if True, user is allowed to edit timer.
 *     allowNew : if True, user is allowed to create new timer
 *     onSave   : a callback, called with user want to save or edit a timer
 *                onSave(mode, timer) is called, mode is either "new" or "edit"
 *
 */
export class TimerTable extends React.Component {
    theTimerEditorRef = React.createRef();
    theDataTableRef     = React.createRef();


    get_page = (offset, limit) => {
        return this.props.get_page(
            offset,
            limit
        );
    };

    render_tools = timer =>
        <Button
            variant="secondary"
            size="sm"
            onClick={
                event => {
                    this.theTimerEditorRef.current.openDialog({
                        mode: this.props.allowEdit?"edit":"view",
                        timer: timer
                    })
                }
            }
        >
            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
        </Button>;

    render_paused = timer => <AppIcon type={timer.paused?"dismiss":"checkmark"} className="icon24"/>;
    render_interval = timer => `${timer.interval_amount} ${timer.interval_unit}`;


    columns = {
        tools:              {display: "", render_data: this.render_tools},
        name:               {display: "Name"},
        paused:             {display: "Active", render_data: this.render_paused},
        category:           {display: "Category"},
        author:             {display: "Author"},
        team:               {display: "Team"},
        interval:           {display: "Interval", render_data: this.render_interval},
        start_from:         {display: "Start"},
        end_at:             {display: "End"},
    };

    onSave = (mode, timer) => {
        return this.props.onSave(mode, timer).then(this.theDataTableRef.current.refresh);
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Schedulers</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.theTimerEditorRef.current.openDialog({mode: "new"});
                                }}
                            >
                                Create
                            </Button>
                        }
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DataTable
                            ref={this.theDataTableRef}
                            hover
                            bordered
                            className="timer-table"
                            columns = {this.columns}
                            id_column = "id"
                            size = {this.props.size}
                            page_size={this.props.page_size}
                            fast_step_count={10}
                            get_page={this.get_page}
                        />
                    </Col>
                </Row>
                <TimerEditor
                    ref={this.theTimerEditorRef}
                    onSave={this.onSave}
                />
            </div>
        );
    }
}

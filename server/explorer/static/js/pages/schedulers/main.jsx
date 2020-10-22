import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {TimerTable} from '/components/timer/main.jsx'

import $ from 'jquery'

import {get_csrf_token, get_current_user} from '/common_lib'

class SchedulersPage extends React.Component {
    state = {
        timers: [],
    }

    onSave = (mode, timer) => {
        if (mode === "new") {
            const to_post = {
                name            : timer.name,
                description     : timer.description,
                team            : timer.team,
                paused          : timer.paused,
                interval_unit   : timer.interval_unit,
                interval_amount : timer.interval_amount,
                start_from      : timer.start_from,
                topic           : timer.topic,
                context         : timer.context
            }

            fetch('/api/Timers/', {
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
                        this.load_timers();
                    }
                )
        } else if (mode === "edit") {
            const to_patch = {
                description     : timer.description,
                team            : timer.team,
                paused          : timer.paused,
                interval_unit   : timer.interval_unit,
                interval_amount : timer.interval_amount,
                start_from      : timer.start_from,
                topic           : timer.topic,
                context         : timer.context
            }

            fetch(`/api/Timers/${timer.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        this.load_timers();
                    }
                )
        }
    };

    load_timers() {
        fetch("/api/Timers/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState({timers: result})
            }
        )
    }

    componentDidMount() {
        this.load_timers();
    }

    render() {
        return (
            <Container fluid>
                <TimerTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    timers={this.state.timers}
                    onSave={this.onSave}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <SchedulersPage current_user={current_user} />,
        document.getElementById('app')
    );
});

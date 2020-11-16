import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {ApplicationTable} from '/components/business/application/application_table.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

import $ from 'jquery'

import {get_csrf_token, get_current_user} from '/common_lib'

class ApplicationsPage extends React.Component {
    theTopMessageRef = React.createRef();

    state = {
        applications: [],
    };

    onSave = (mode, application) => {
        if (mode === "new") {
            // for new application, you do not need to pass "retired" -- it is false
            const to_post = {
                name            : application.name,
                description     : application.description,
                team            : application.team,
                app_location    : application.app_location,
            }

            fetch('/api/Applications/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .catch(() => {
                    this.theTopMessageRef.current.show("danger", "Unable to save!");
                })
                .then(
                    (result) => {
                        this.load_applications();
                    }
                )
        } else if (mode === "edit") {
            const to_patch = {
                description     : application.description,
                team            : application.team,
                app_location    : application.app_location,
                retired         : application.retired,
            }
            fetch(`/api/Applications/${application.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            })
                .then((res) => res.json())
                .catch(() => {
                    this.theTopMessageRef.current.show("danger", "Unable to save!");
                })
                .then(
                    (result) => {
                        this.load_applications();
                    }
                )
        }
    };


    load_applications() {
        fetch("/api/Applications/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState({applications: result.results})
            }
        )
    }


    componentDidMount() {
        this.load_applications();
    }

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <ApplicationTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    applications={this.state.applications}
                    onSave={this.onSave}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <ApplicationsPage current_user={current_user} />,
        document.getElementById('app')
    );
});

# frozen_string_literal: true

$LOAD_PATH.unshift File.expand_path("../lib", __dir__)

require "docuforge"
require "faraday"
require "json"

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end

module DocuForgeSpecHelpers
  BASE_URL = "https://api.test.local"

  # Build a DocuForge::Client whose Faraday connection uses the supplied
  # Faraday::Adapter::Test::Stubs. Real network is never touched.
  def build_client(stubs, api_key: "df_live_test", max_retries: 0)
    client = DocuForge::Client.new(
      api_key: api_key,
      base_url: BASE_URL,
      timeout: 5,
      max_retries: max_retries
    )
    test_conn = Faraday.new(url: BASE_URL) do |f|
      f.headers["Authorization"] = "Bearer #{api_key}"
      f.headers["Content-Type"] = "application/json"
      f.headers["User-Agent"] = "docuforge-ruby/#{DocuForge::VERSION}"
      f.adapter(:test, stubs)
    end
    client.instance_variable_set(:@conn, test_conn)
    client
  end
end
